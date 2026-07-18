import { abilityModifier, createSeededRandom, type RandomFn } from './abilities'
import type { RetiredAdventurerProfile } from '../shared/npcCombat/types'
import type { RetiredAdventurerStatProfile } from '../shared/hp/types'

export type Archetype = 'fighter' | 'rogue' | 'mage' | 'cleric' | 'ranger'

export const HIT_DIE_SIZE: Record<Archetype, number> = {
  fighter: 10,
  rogue: 8,
  mage: 6,
  cleric: 8,
  ranger: 10
}

export const VILLAGER_MAX_HP = 10
export const CATALOG_MONSTER_MIN_MAX_HP = 4

export const RETIRED_ADVENTURER_PROFILE_STATS: Record<RetiredAdventurerProfile, RetiredAdventurerStatProfile> = {
  brawler: { archetype: 'fighter', level: 3, bodyScore: 16 },
  skirmisher: { archetype: 'rogue', level: 3, bodyScore: 14 },
  veteran: { archetype: 'fighter', level: 5, bodyScore: 16 }
}

export function hashStringSeed(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

export function rollHitDie(sides: number, rng: RandomFn): number {
  return Math.floor(rng() * sides) + 1
}

export function computeMaxHpFromHitDice(bodyScore: number, hitDieRolls: number[]): number {
  if (hitDieRolls.length === 0) {
    return Math.max(1, abilityModifier(bodyScore))
  }
  const sum = hitDieRolls.reduce((total, roll) => total + roll, 0)
  return Math.max(1, sum + abilityModifier(bodyScore))
}

export function rollInitialMaxHp(
  archetype: Archetype,
  bodyScore: number,
  rng: RandomFn
): { maxHp: number; hitDieRolls: number[] } {
  const roll = rollHitDie(HIT_DIE_SIZE[archetype], rng)
  const hitDieRolls = [roll]
  return { maxHp: computeMaxHpFromHitDice(bodyScore, hitDieRolls), hitDieRolls }
}

export function rollLevelUpHpGain(archetype: Archetype, rng: RandomFn): number {
  return rollHitDie(HIT_DIE_SIZE[archetype], rng)
}

export function rollMaxHpForLevel(
  archetype: Archetype,
  level: number,
  bodyScore: number,
  rng: RandomFn
): { maxHp: number; hitDieRolls: number[] } {
  const hitDieRolls: number[] = []
  const safeLevel = Math.max(1, level)
  for (let i = 0; i < safeLevel; i += 1) {
    hitDieRolls.push(rollHitDie(HIT_DIE_SIZE[archetype], rng))
  }
  return { maxHp: computeMaxHpFromHitDice(bodyScore, hitDieRolls), hitDieRolls }
}

export interface ApplyLevelUpHitDiceParams {
  archetype: Archetype
  bodyScore: number
  existingRolls: number[]
  levelsGained: number
  rng: RandomFn
}

export function applyLevelUpHitDice(params: ApplyLevelUpHitDiceParams): {
  hitDieRolls: number[]
  hpGain: number
  maxHp: number
} {
  const hitDieRolls = [...params.existingRolls]
  let hpGain = 0
  for (let i = 0; i < params.levelsGained; i += 1) {
    const roll = rollLevelUpHpGain(params.archetype, params.rng)
    hitDieRolls.push(roll)
    hpGain += roll
  }
  return { hitDieRolls, hpGain, maxHp: computeMaxHpFromHitDice(params.bodyScore, hitDieRolls) }
}

export function pickLevelInRange(levelMin: number, levelMax: number, seed: string): number {
  if (levelMin >= levelMax) {
    return levelMin
  }
  const rng = createSeededRandom(hashStringSeed(seed))
  const span = levelMax - levelMin + 1
  return levelMin + Math.floor(rng() * span)
}

export interface CatalogMonsterHpParams {
  npcId: string
  catalogKey: string
  archetypeHint?: Archetype
  levelMin: number
  levelMax: number
  bodyScore: number
}

export function computeCatalogMonsterHp(params: CatalogMonsterHpParams): {
  level: number
  maxHp: number
  hitDieRolls: number[]
} {
  const level = pickLevelInRange(params.levelMin, params.levelMax, `${params.npcId}:${params.catalogKey}`)
  const archetype = params.archetypeHint ?? 'fighter'
  const rng = createSeededRandom(hashStringSeed(`${params.npcId}:${params.catalogKey}:hp`))
  const rolled = rollMaxHpForLevel(archetype, level, params.bodyScore, rng)
  return {
    level,
    maxHp: Math.max(CATALOG_MONSTER_MIN_MAX_HP, rolled.maxHp),
    hitDieRolls: rolled.hitDieRolls
  }
}

export function computeRetiredAdventurerHp(
  npcId: string,
  profile: RetiredAdventurerProfile
): { maxHp: number; hitDieRolls: number[] } {
  const statProfile = RETIRED_ADVENTURER_PROFILE_STATS[profile]
  const rng = createSeededRandom(hashStringSeed(`${npcId}:retired:${profile}`))
  return rollMaxHpForLevel(statProfile.archetype, statProfile.level, statProfile.bodyScore, rng)
}
