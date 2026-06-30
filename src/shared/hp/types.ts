import type { AbilityScores } from '../../engine/abilities'
import type { Archetype } from '../../engine/hp'

export interface HitDieRollLog {
  rolls: number[]
  bodyModifier: number
  maxHp: number
}

export interface MaxHpBreakdown {
  hitDieRolls: number[]
  bodyScore: number
  maxHp: number
}

export interface RetiredAdventurerStatProfile {
  archetype: Archetype
  level: number
  bodyScore: number
}

export interface CatalogMonsterHpInput {
  archetype: Archetype
  level: number
  bodyScore: number
  npcId: string
  catalogKey: string
}

export interface CharacterHpStats {
  maxHp?: number
  hitDieRolls?: number[]
  abilityScores?: AbilityScores
}

function isAbilityScores(value: unknown): value is AbilityScores {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record['body'] === 'number' &&
    typeof record['agility'] === 'number' &&
    typeof record['mind'] === 'number' &&
    typeof record['presence'] === 'number'
  )
}

export function parseCharacterHpStats(stats: unknown): CharacterHpStats | undefined {
  if (typeof stats !== 'object' || stats === null) {
    return undefined
  }
  const record = stats as Record<string, unknown>
  const parsed: CharacterHpStats = {}
  if (typeof record['maxHp'] === 'number') {
    parsed.maxHp = record['maxHp']
  }
  if (Array.isArray(record['hitDieRolls']) && record['hitDieRolls'].every((roll) => typeof roll === 'number')) {
    parsed.hitDieRolls = record['hitDieRolls'] as number[]
  }
  if (isAbilityScores(record['abilityScores'])) {
    parsed.abilityScores = record['abilityScores']
  }
  if (Object.keys(parsed).length === 0) {
    return undefined
  }
  return parsed
}

export function hasAuthoritativeMaxHp(stats: CharacterHpStats | undefined): boolean {
  return typeof stats?.maxHp === 'number' && stats.maxHp > 0
}

export function isHitDieRollLog(value: unknown): value is HitDieRollLog {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    Array.isArray(record['rolls']) &&
    record['rolls'].every((roll) => typeof roll === 'number') &&
    typeof record['bodyModifier'] === 'number' &&
    typeof record['maxHp'] === 'number'
  )
}

export function isRetiredAdventurerStatProfile(value: unknown): value is RetiredAdventurerStatProfile {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  const archetypes = ['fighter', 'rogue', 'mage', 'cleric', 'ranger'] as const
  return (
    typeof record['archetype'] === 'string' &&
    archetypes.includes(record['archetype'] as (typeof archetypes)[number]) &&
    typeof record['level'] === 'number' &&
    typeof record['bodyScore'] === 'number'
  )
}

export function isCatalogMonsterHpInput(value: unknown): value is CatalogMonsterHpInput {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  const archetypes = ['fighter', 'rogue', 'mage', 'cleric', 'ranger'] as const
  return (
    typeof record['archetype'] === 'string' &&
    archetypes.includes(record['archetype'] as (typeof archetypes)[number]) &&
    typeof record['level'] === 'number' &&
    typeof record['bodyScore'] === 'number' &&
    typeof record['npcId'] === 'string' &&
    typeof record['catalogKey'] === 'string'
  )
}
