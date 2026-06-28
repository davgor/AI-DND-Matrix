import type Database from 'better-sqlite3'
import type { RandomFn } from '../engine/abilities'
import { resolveLegendaryDeath } from '../engine/deathLegendary'
import { resolveRespawnDeath } from '../engine/deathRespawn'
import {
  recordDyingSaveResult,
  startDyingSequence,
  type DyingState
} from '../engine/dying'
import { resolveSave } from '../engine/saves'
import { getCampaignById, type Campaign } from '../db/repositories/campaigns'
import { getCharacterById, updateCharacter, type Character } from '../db/repositories/characters'
import { restoreLatestSave } from '../db/repositories/saves'

const DYING_SAVE_DC = 10
const STABILIZED_HP = 1

export type DyingResolutionStatus =
  | 'unconscious'
  | 'stabilized_and_revived'
  | 'reverted'
  | 'permanently_dead'
  | 'respawned'

export interface DyingResolution {
  status: DyingResolutionStatus
  message: string
}

interface CharacterStats {
  dyingState?: DyingState
  respawnUsesRemaining?: number
  abilityScores?: { body: number }
  [key: string]: unknown
}

function getStats(character: Character): CharacterStats {
  return character.stats as CharacterStats
}

export function applyDamageAndStartDyingIfNeeded(
  db: Database.Database,
  character: Character,
  damage: number
): { hpAfter: number; resolution?: DyingResolution } {
  const hpAfter = Math.max(0, character.hp - damage)
  if (hpAfter > 0) {
    updateCharacter(db, character.id, { hp: hpAfter })
    return { hpAfter }
  }

  const dyingState = startDyingSequence()
  updateCharacter(db, character.id, { hp: 0, stats: { ...getStats(character), dyingState } })
  return {
    hpAfter: 0,
    resolution: {
      status: 'unconscious',
      message: `${character.name} drops to 0 HP and is unconscious, fighting to stabilize.`
    }
  }
}

function resolveLostDyingSequence(
  db: Database.Database,
  campaign: Campaign,
  character: Character,
  lostDyingState: DyingState
): DyingResolution {
  if (campaign.deathMode === 'standard') {
    restoreLatestSave(db, campaign.id)
    return {
      status: 'reverted',
      message: `Reality rewinds to the moment before the fatal blow — ${character.name} and the party find themselves safe, as if it never happened.`
    }
  }

  if (campaign.deathMode === 'respawn' && campaign.respawnRules) {
    const stats = getStats(character)
    const outcome = resolveRespawnDeath(
      { ...campaign.respawnRules, limit: campaign.respawnRules.limit ?? undefined },
      { currency: character.currency, remainingUses: stats.respawnUsesRemaining }
    )
    if (outcome.mode === 'legendary') {
      updateCharacter(db, character.id, { stats: { ...stats, dyingState: undefined } })
      return {
        status: 'permanently_dead',
        message: `${character.name} has exhausted every respawn and has died. This is permanent.`
      }
    }
    updateCharacter(db, character.id, {
      hp: STABILIZED_HP,
      stats: { ...stats, dyingState: undefined, respawnUsesRemaining: outcome.remainingUses }
    })
    db.prepare('UPDATE characters SET currency = ? WHERE id = ?').run(outcome.currency, character.id)
    return {
      status: 'respawned',
      message: `${character.name} awakens at ${outcome.location}, alive but worse for it.`
    }
  }

  resolveLegendaryDeath(lostDyingState)
  updateCharacter(db, character.id, { stats: { ...getStats(character), dyingState: undefined } })
  return {
    status: 'permanently_dead',
    message: `${character.name} has died. This is permanent.`
  }
}

export function progressDyingSequence(
  db: Database.Database,
  campaignId: string,
  character: Character,
  rng: RandomFn
): DyingResolution | null {
  const stats = getStats(character)
  const dyingState = stats.dyingState
  if (!dyingState || dyingState.stabilized || dyingState.lost) {
    return null
  }

  const campaign = getCampaignById(db, campaignId)
  if (!campaign) {
    return null
  }

  const bodyScore = stats.abilityScores?.body ?? 10
  const save = resolveSave({
    ability: 'body',
    rng,
    abilityScore: bodyScore,
    proficient: false,
    proficiencyBonus: 0,
    dc: DYING_SAVE_DC
  })
  const next = recordDyingSaveResult(dyingState, save.success)

  if (next.stabilized) {
    updateCharacter(db, character.id, { hp: STABILIZED_HP, stats: { ...stats, dyingState: undefined } })
    return {
      status: 'stabilized_and_revived',
      message: `${character.name} stabilizes and wakes up, battered but alive.`
    }
  }

  if (next.lost) {
    return resolveLostDyingSequence(db, campaign, character, next)
  }

  updateCharacter(db, character.id, { stats: { ...stats, dyingState: next } })
  return {
    status: 'unconscious',
    message: `${character.name} is still unconscious and fighting to stabilize.`
  }
}

export function reloadCharacter(db: Database.Database, characterId: string): Character | undefined {
  return getCharacterById(db, characterId)
}
