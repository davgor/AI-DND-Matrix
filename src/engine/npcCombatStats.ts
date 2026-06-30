import type { DamageRoll } from './damage'
import type {
  NpcCombatStats,
  NpcCombatTier,
  RetiredAdventurerProfile
} from '../shared/npcCombat/types'

export const VILLAGER_STATS: NpcCombatStats = {
  hp: 6,
  maxHp: 6,
  ac: 10,
  attackBonus: 0,
  damageRoll: { diceCount: 1, diceSize: 4, modifier: 0 }
}

const RETIRED_ADVENTURER_STATS: Record<RetiredAdventurerProfile, NpcCombatStats> = {
  brawler: {
    hp: 22,
    maxHp: 22,
    ac: 14,
    attackBonus: 4,
    damageRoll: { diceCount: 1, diceSize: 8, modifier: 2 }
  },
  skirmisher: {
    hp: 18,
    maxHp: 18,
    ac: 15,
    attackBonus: 5,
    damageRoll: { diceCount: 1, diceSize: 6, modifier: 3 }
  },
  veteran: {
    hp: 28,
    maxHp: 28,
    ac: 16,
    attackBonus: 5,
    damageRoll: { diceCount: 2, diceSize: 6, modifier: 2 }
  }
}

/** Max retired-adventurer HP/AC caps documented in 032.1 — below a fresh level-5 PC. */
export const RETIRED_ADVENTURER_MAX_HP = 28
export const RETIRED_ADVENTURER_MAX_AC = 16

export function getNpcCombatStats(
  tier: Exclude<NpcCombatTier, 'catalog'>,
  profile?: RetiredAdventurerProfile
): NpcCombatStats {
  if (tier === 'villager') {
    return VILLAGER_STATS
  }
  if (!profile) {
    return VILLAGER_STATS
  }
  return RETIRED_ADVENTURER_STATS[profile]
}

export function getVillagerCombatStats(): NpcCombatStats {
  return getNpcCombatStats('villager')
}

export function serializeDamageRoll(roll: DamageRoll): string {
  return JSON.stringify(roll)
}

export function parseDamageRoll(raw: string): DamageRoll {
  const parsed = JSON.parse(raw) as DamageRoll
  return parsed
}
