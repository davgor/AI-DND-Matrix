import type { DamageRoll } from './damage'
import type {
  NpcCombatStats,
  NpcCombatTier,
  RetiredAdventurerProfile
} from '../shared/npcCombat/types'
import { VILLAGER_MAX_HP } from './hp'

export const VILLAGER_STATS: NpcCombatStats = {
  hp: VILLAGER_MAX_HP,
  maxHp: VILLAGER_MAX_HP,
  ac: 10,
  attackBonus: 0,
  damageRoll: { diceCount: 1, diceSize: 4, modifier: 0 }
}

const RETIRED_ADVENTURER_COMBAT: Record<
  RetiredAdventurerProfile,
  Pick<NpcCombatStats, 'ac' | 'attackBonus' | 'damageRoll'>
> = {
  brawler: {
    ac: 14,
    attackBonus: 4,
    damageRoll: { diceCount: 1, diceSize: 8, modifier: 2 }
  },
  skirmisher: {
    ac: 15,
    attackBonus: 5,
    damageRoll: { diceCount: 1, diceSize: 6, modifier: 3 }
  },
  veteran: {
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
  const combat = RETIRED_ADVENTURER_COMBAT[profile]
  return { hp: 0, maxHp: 0, ...combat }
}

export function getRetiredAdventurerCombatStats(
  profile: RetiredAdventurerProfile
): Pick<NpcCombatStats, 'ac' | 'attackBonus' | 'damageRoll'> {
  return RETIRED_ADVENTURER_COMBAT[profile]
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
