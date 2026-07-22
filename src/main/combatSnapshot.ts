import type Database from 'better-sqlite3'
import { conditionsFromStats, type Condition } from '../engine/conditions'
import { resolveCharacterMaxHp } from '../shared/hp/resolveMaxHp'
import type { CombatStateSnapshot, CombatantRef } from '../shared/combat/types'
import { combatantRefKey } from '../shared/combat/types'
import { getActiveCombatant, type CombatEncounter } from '../db/repositories/combatEncounters'
import { getCharacterById } from '../db/repositories/characters'
import { getNpcById, isNpcOutOfFight } from '../db/repositories/npcs'

function isCombatantVisible(db: Database.Database, ref: CombatantRef, playerExited: boolean, playerId: string | undefined): boolean {
  if (playerExited && ref.kind === 'player' && ref.id === playerId) {
    return false
  }
  if (ref.kind !== 'npc') {
    return true
  }
  const npc = getNpcById(db, ref.id)
  return !!npc && npc.hp !== null && (npc.encounterOutcome !== null || npc.hp > 0)
}

function buildCombatantEntry(db: Database.Database, ref: CombatantRef, active: CombatantRef) {
  const stats = resolveCombatantHp(db, ref)
  const encounterOutcome = ref.kind === 'npc' ? getNpcById(db, ref.id)?.encounterOutcome ?? undefined : undefined
  return { ref, name: resolveCombatantName(db, ref), hp: stats.hp, maxHp: stats.maxHp, conditions: stats.conditions, isActive: refsEqual(ref, active), encounterOutcome }
}

export function buildCombatStateSnapshot(
  db: Database.Database,
  encounter: CombatEncounter,
  playerCharacterId?: string
): CombatStateSnapshot {
  const active = getActiveCombatant(encounter)
  const playerRef: CombatantRef = { kind: 'player', id: playerCharacterId ?? '' }
  const playerExited =
    playerCharacterId !== undefined &&
    encounter.exitedCombatantIds.some((ref) => combatantRefKey(ref) === combatantRefKey(playerRef))
  const initiativeOrder = encounter.initiativeOrder.map((entry) => ({
    ref: entry.combatant,
    name: resolveCombatantName(db, entry.combatant),
    roll: entry.roll,
    isActive: refsEqual(entry.combatant, active)
  }))
  const combatants = encounter.participantIds
    .filter((ref) => isCombatantVisible(db, ref, playerExited, playerCharacterId))
    .map((ref) => buildCombatantEntry(db, ref, active))
  return {
    encounterId: encounter.id,
    round: encounter.round,
    activeCombatant: active,
    pursuitState: encounter.pursuitState,
    playerExited,
    initiativeOrder,
    combatants
  }
}

export function summarizeHostilesInEncounter(db: Database.Database, encounter: CombatEncounter): string {
  const names: string[] = []
  for (const participant of encounter.participantIds) {
    if (participant.kind !== 'npc') {
      continue
    }
    const npc = getNpcById(db, participant.id)
    if (npc && !isNpcOutOfFight(npc)) {
      names.push(npc.name)
    }
  }
  return names.length > 0 ? names.join(', ') : 'none visible'
}

function refsEqual(a: CombatantRef, b: CombatantRef): boolean {
  return a.kind === b.kind && a.id === b.id
}

function resolveCombatantName(db: Database.Database, ref: CombatantRef): string {
  if (ref.kind === 'npc') {
    return getNpcById(db, ref.id)?.name ?? 'Unknown'
  }
  return getCharacterById(db, ref.id)?.name ?? 'Unknown'
}

function resolveNpcHp(db: Database.Database, ref: CombatantRef) {
  const npc = getNpcById(db, ref.id)
  return { hp: npc?.hp ?? 0, maxHp: npc?.maxHp ?? 0, conditions: npc?.conditions ?? [] }
}

function resolveCharacterHp(db: Database.Database, ref: CombatantRef) {
  const character = getCharacterById(db, ref.id)
  const maxHp = character ? resolveCharacterMaxHp(character) : 0
  const conditions = conditionsFromStats(character?.stats)
  return { hp: character?.hp ?? 0, maxHp, conditions }
}

function resolveCombatantHp(
  db: Database.Database,
  ref: CombatantRef
): { hp: number; maxHp: number; conditions: Condition[] } {
  return ref.kind === 'npc' ? resolveNpcHp(db, ref) : resolveCharacterHp(db, ref)
}
