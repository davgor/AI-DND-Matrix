import type { Condition } from '../../engine/conditions'
import type { InitiativeEntry as EngineInitiativeEntry } from '../../engine/combat'
import type { EncounterPursuitState } from './flee/types'

export const ENCOUNTER_PHASES = ['idle', 'active', 'resolved'] as const
export type EncounterPhase = (typeof ENCOUNTER_PHASES)[number]

export const ENCOUNTER_OUTCOMES = ['defeated', 'fled', 'retreated'] as const
export type EncounterOutcome = (typeof ENCOUNTER_OUTCOMES)[number]

export const COMBATANT_KINDS = ['player', 'ai_party_member', 'npc'] as const
export type CombatantKind = (typeof COMBATANT_KINDS)[number]

export const COMBAT_INTENTS = ['none', 'startEncounter', 'attack', 'endEncounter', 'flee'] as const
export type CombatIntent = (typeof COMBAT_INTENTS)[number]

export const NPC_YIELD_OUTCOMES = ['surrender', 'flee', 'incapacitated', 'slain'] as const
export type NpcYieldOutcome = (typeof NPC_YIELD_OUTCOMES)[number]

export const MAX_COMBAT_CATCHUP_TURNS = 10

export interface CombatantRef {
  kind: CombatantKind
  id: string
}

export interface InitiativeEntry {
  combatant: CombatantRef
  roll: number
}

export interface CombatEncounter {
  id: string
  campaignId: string
  phase: 'active' | 'resolved'
  outcome?: EncounterOutcome
  initiativeOrder: InitiativeEntry[]
  activeTurnIndex: number
  round: number
  participantIds: CombatantRef[]
  pursuitState: EncounterPursuitState
  exitedCombatantIds: CombatantRef[]
  startedAt: string
  endedAt?: string
}

export interface CombatAttackResult {
  attacker: CombatantRef
  target: CombatantRef
  hit: boolean
  crit: boolean
  attackRoll: number
  attackTotal: number
  damage: number
  damageBreakdown?: import('../weaponModifications/types').DamageBreakdown
  targetHpAfter: number
  targetDefeated: boolean
}

export interface CombatantHudEntry {
  ref: CombatantRef
  name: string
  hp: number
  maxHp: number
  conditions: Condition[]
  isActive: boolean
  encounterOutcome?: NpcYieldOutcome
}

export interface CombatStateSnapshot {
  encounterId: string
  round: number
  activeCombatant: CombatantRef
  pursuitState: EncounterPursuitState
  playerExited: boolean
  initiativeOrder: Array<{ ref: CombatantRef; name: string; roll: number; isActive: boolean }>
  combatants: CombatantHudEntry[]
}

export function combatantRefKey(ref: CombatantRef): string {
  return `${ref.kind}:${ref.id}`
}

export function parseCombatantRefKey(key: string): CombatantRef | undefined {
  const [kind, ...rest] = key.split(':')
  if (!kind || rest.length === 0) {
    return undefined
  }
  if (!(COMBATANT_KINDS as readonly string[]).includes(kind)) {
    return undefined
  }
  return { kind: kind as CombatantKind, id: rest.join(':') }
}

export function normalizeCombatantRef(value: unknown): CombatantRef | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const record = value as Record<string, unknown>
  const kind = record['kind']
  const id = record['id']
  if (typeof kind !== 'string' || typeof id !== 'string') {
    return undefined
  }
  if (!(COMBATANT_KINDS as readonly string[]).includes(kind)) {
    return undefined
  }
  return { kind: kind as CombatantKind, id }
}

export function isInitiativeEntry(value: unknown): value is InitiativeEntry {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  const combatant = normalizeCombatantRef(record['combatant'])
  return combatant !== undefined && typeof record['roll'] === 'number'
}

function hasEncounterArrays(record: Record<string, unknown>): boolean {
  const order = record['initiativeOrder']
  const participants = record['participantIds']
  if (!Array.isArray(order) || !Array.isArray(participants)) {
    return false
  }
  return (
    order.every(isInitiativeEntry) &&
    participants.every((entry) => normalizeCombatantRef(entry) !== undefined)
  )
}

function hasEncounterScalars(record: Record<string, unknown>): boolean {
  return (
    typeof record['activeTurnIndex'] === 'number' &&
    typeof record['round'] === 'number' &&
    typeof record['id'] === 'string' &&
    typeof record['campaignId'] === 'string' &&
    typeof record['startedAt'] === 'string'
  )
}

export function isCombatEncounterJson(value: unknown): value is CombatEncounter {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  if (record['phase'] !== 'active' && record['phase'] !== 'resolved') {
    return false
  }
  return hasEncounterArrays(record) && hasEncounterScalars(record)
}

export function engineInitiativeToShared(
  entries: EngineInitiativeEntry[],
  kindById: Map<string, CombatantKind>
): InitiativeEntry[] {
  return entries.map((entry) => ({
    combatant: { kind: kindById.get(entry.id) ?? 'npc', id: entry.id },
    roll: entry.roll
  }))
}
