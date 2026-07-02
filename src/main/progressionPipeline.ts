import type Database from 'better-sqlite3'
import type { Provider } from '../agents/providers/types'
import { getSpellByKey } from '../db/catalog/spells'
import { appendEvent } from '../db/repositories/events'
import { getCharacterById, updateCharacter } from '../db/repositories/characters'
import { applyPerk, PERK_HP_BONUS, type CharacterPerkStats } from '../engine/perks'
import type { CombatEncounter } from '../shared/combat/types'
import type { PendingLevelUpCeremony, PerkProposal } from '../shared/progression/types'
import { assembleEncounterXpContext, encounterEligibleForXp } from './encounterXpContext'
import { assembleQuestXpContext } from './questXpContext'
import { enrichTurnWithEncounterLoot, shouldSkipQuestLoot } from './lootPipeline'
import type { TurnResult } from './turnIpc'
import { executeXpPass } from './xpAwardPersistence'
import {
  getPendingLevelUpQueue,
  hasPendingLevelUp
} from './progressionPendingState'

export class LevelUpPendingError extends Error {
  constructor() {
    super('Complete your level-up before taking another action.')
    this.name = 'LevelUpPendingError'
  }
}

export interface XpPassResult {
  xpNarration: string
  xpAmount: number
  leveledUp: boolean
  levelsGained: number
}

export function getPendingLevelUpCeremony(
  db: Database.Database,
  characterId: string
): PendingLevelUpCeremony | null {
  const character = getCharacterById(db, characterId)
  if (!character) {
    return null
  }
  return getPendingLevelUpQueue(character)[0] ?? null
}

export async function runEncounterXpPass(input: {
  db: Database.Database
  provider: Provider
  encounter: CombatEncounter
  campaignId: string
  playerCharacterId: string
  regionId: string
}): Promise<XpPassResult | null> {
  if (!encounterEligibleForXp(input.encounter)) {
    return null
  }
  const context = assembleEncounterXpContext(input.db, {
    encounter: input.encounter,
    campaignId: input.campaignId,
    playerCharacterId: input.playerCharacterId,
    regionId: input.regionId
  })
  if (!context) {
    return null
  }
  return executeXpPass({ db: input.db, provider: input.provider, context })
}

export async function runQuestXpPass(input: {
  db: Database.Database
  provider: Provider
  campaignId: string
  threadId?: string
  questId?: string
  regionId: string
  playerCharacterId: string
  playerLevel: number
  encounterXpRanThisTurn?: boolean
}): Promise<XpPassResult | null> {
  if (shouldSkipQuestLoot(input.encounterXpRanThisTurn === true)) {
    return null
  }
  const context = assembleQuestXpContext({
    db: input.db,
    campaignId: input.campaignId,
    threadId: input.threadId,
    questId: input.questId,
    regionId: input.regionId,
    playerCharacterId: input.playerCharacterId,
    playerLevel: input.playerLevel
  })
  if (!context) {
    return null
  }
  return executeXpPass({ db: input.db, provider: input.provider, context })
}

export async function enrichTurnWithEncounterRewards(input: {
  db: Database.Database
  provider: Provider
  encounter: CombatEncounter
  campaignId: string
  playerCharacterId: string
  regionId: string
  base: TurnResult
}): Promise<TurnResult> {
  const xp = await runEncounterXpPass({
    db: input.db,
    provider: input.provider,
    encounter: input.encounter,
    campaignId: input.campaignId,
    playerCharacterId: input.playerCharacterId,
    regionId: input.regionId
  })

  const result: TurnResult = xp
    ? {
        ...input.base,
        xpNarration: xp.xpNarration,
        xpAmount: xp.xpAmount,
        leveledUp: xp.leveledUp,
        levelsGained: xp.levelsGained
      }
    : input.base

  return enrichTurnWithEncounterLoot({
    db: input.db,
    provider: input.provider,
    encounter: input.encounter,
    campaignId: input.campaignId,
    playerCharacterId: input.playerCharacterId,
    regionId: input.regionId,
    base: result
  })
}

export function submitPerkChoice(
  db: Database.Database,
  characterId: string,
  perkId: string
): { applied: boolean; mechanicalSummary?: string } {
  const character = getCharacterById(db, characterId)
  if (!character) {
    throw new Error(`Character ${characterId} not found`)
  }

  const queue = [...getPendingLevelUpQueue(character)]
  const ceremony = queue[0]
  if (!ceremony) {
    return { applied: false }
  }

  const proposal = ceremony.perks.find((p) => p.id === perkId)
  if (!proposal) {
    throw new Error(`Perk ${perkId} is not among pending options`)
  }

  const appliedResult = applyPerk({
    proposal,
    levelGained: ceremony.targetLevel,
    stats: character.stats,
    validateSpellKey: (key) => Boolean(getSpellByKey(db, key))
  })

  let hp = character.hp
  const stats = appliedResult.stats as CharacterPerkStats
  if (proposal.category === 'hp_max_bonus') {
    hp += PERK_HP_BONUS
    stats.maxHp = (stats.maxHp ?? character.hp) + PERK_HP_BONUS
  }

  queue.shift()
  stats.pendingLevelUpQueue = queue
  stats.lastLevelUpXp = character.xp
  updateCharacter(db, characterId, { stats: stats as unknown as Record<string, unknown>, hp })

  appendEvent(db, {
    campaignId: character.campaignId,
    type: 'perk_chosen',
    payload: {
      characterId,
      perkId: proposal.id,
      category: proposal.category,
      level: ceremony.targetLevel,
      mechanicalSummary: appliedResult.applied.mechanicalSummary
    }
  })

  return { applied: true, mechanicalSummary: appliedResult.applied.mechanicalSummary }
}

export function assertNoPendingLevelUp(db: Database.Database, characterId: string): void {
  const character = getCharacterById(db, characterId)
  if (character && hasPendingLevelUp(character)) {
    throw new LevelUpPendingError()
  }
}

export type { PerkProposal, PendingLevelUpCeremony }
