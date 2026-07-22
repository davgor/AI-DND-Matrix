import type Database from 'better-sqlite3'
import type { RandomFn } from '../engine/abilities'
import { proficiencyBonus } from '../engine/proficiency'
import { conditionsFromStats } from '../engine/conditions'
import { resolvePlayerAttackAgainstNpc } from '../engine/playerAttack'
import { getEquippedWeaponDamageProfile } from '../db/repositories/characterItems'
import { resolveNpcResistanceProfile } from '../db/repositories/npcResistances'
import type { AbilityScores } from '../engine/abilities'
import { abilityModifier } from '../engine/abilities'
import {
  findNpcByNameInRegion,
  getNpcById,
  isNpcAttackableInRegion,
  updateNpcDisposition,
  applyNpcDamage,
  setNpcEncounterOutcome,
  type Npc
} from '../db/repositories/npcs'
import { ensureNpcCombatStats } from '../db/repositories/npcCombatHydration'
import { getActiveEncounter } from '../db/repositories/combatEncounters'
import { startEncounter } from './combatOrchestration'
import { PROVOKE_HOSTILE_DISPOSITION } from '../shared/npcCombat/types'
import type { Character } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { recordNpcPlayerInteraction } from './npcInteractionWatermark'

export class NpcAttackTargetError extends Error {}

function ensureHostileDisposition(db: Database.Database, npc: Npc): Npc {
  if (npc.disposition.toLowerCase().startsWith('hostile')) {
    return npc
  }
  updateNpcDisposition(db, npc.id, PROVOKE_HOSTILE_DISPOSITION)
  return { ...npc, disposition: PROVOKE_HOSTILE_DISPOSITION }
}

function strikeProvokedNpc(
  db: Database.Database,
  player: Character,
  npc: Npc,
  rng: RandomFn
) {
  const scores = (player.stats as { abilityScores?: AbilityScores }).abilityScores
  const body = scores?.body ?? 10
  const attackModifier = abilityModifier(body) + proficiencyBonus(player.level)
  const weaponProfile = getEquippedWeaponDamageProfile(db, player.id)
  const resolution = resolvePlayerAttackAgainstNpc({
    rng,
    attackModifier,
    weaponComponents: weaponProfile.components,
    targetAc: npc.ac ?? 10,
    targetHp: npc.hp ?? 1,
    targetResistances: resolveNpcResistanceProfile(db, npc),
    attackerConditions: conditionsFromStats(player.stats)
  })
  if (resolution.hit) {
    applyNpcDamage(db, npc.id, resolution.damage)
    if (resolution.targetDefeated) {
      setNpcEncounterOutcome(db, npc.id, 'slain')
    }
  }
  return resolution
}

export function resolveAttackTarget(
  db: Database.Database,
  regionId: string,
  targetName: string
): Npc {
  const npc = findNpcByNameInRegion(db, regionId, targetName)
  if (!npc) {
    throw new NpcAttackTargetError('No NPC in this region matches that name.')
  }
  if (!isNpcAttackableInRegion(npc, regionId)) {
    throw new NpcAttackTargetError('That target cannot be attacked right now.')
  }
  return ensureNpcCombatStats(db, npc)
}

export interface ProvokeAttackResult {
  npc: Npc
  hit: boolean
  damage: number
  targetHpAfter: number
  targetDefeated: boolean
  encounterStarted: boolean
}

export async function provokeAndAttackNpc(input: {
  db: Database.Database
  campaignId: string
  regionId: string
  player: Character
  targetNpcId: string
  rng: RandomFn
}): Promise<ProvokeAttackResult> {
  const { db, campaignId, regionId, player, targetNpcId, rng } = input
  let npc = ensureNpcCombatStats(db, getNpcById(db, targetNpcId) as Npc)
  if (!isNpcAttackableInRegion(npc, regionId)) {
    throw new NpcAttackTargetError('That target cannot be attacked right now.')
  }

  npc = ensureHostileDisposition(db, npc)
  const resolution = strikeProvokedNpc(db, player, npc, rng)

  let encounterStarted = false
  if (!getActiveEncounter(db, campaignId)) {
    await startEncounter({
      db,
      campaignId,
      regionId,
      player,
      participantNpcIds: [npc.id],
      rng
    })
    encounterStarted = true
  }

  appendEvent(db, {
    campaignId,
    type: 'player_attack_npc',
    payload: {
      targetNpcId: npc.id,
      hit: resolution.hit,
      damage: resolution.damage,
      provoked: true
    }
  })
  recordNpcPlayerInteraction(db, npc.id)

  return {
    npc,
    hit: resolution.hit,
    damage: resolution.damage,
    targetHpAfter: resolution.targetHpAfter,
    targetDefeated: resolution.targetDefeated,
    encounterStarted
  }
}

export function extractNpcNameFromAttackInput(playerInput: string): string | undefined {
  const match = playerInput.match(/\battack\s+(.+?)(?:\s+with|\s+using|$)/i)
  if (match?.[1]) {
    return match[1].trim()
  }
  const simple = playerInput.match(/\b(?:hit|strike|punch|stab|shoot)\s+(.+)/i)
  return simple?.[1]?.trim()
}
