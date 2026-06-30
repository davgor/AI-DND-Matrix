import { describe, expect, it } from 'vitest'
import { computeRetiredAdventurerHp } from './hp'
import {
  getNpcCombatStats,
  RETIRED_ADVENTURER_MAX_AC,
  RETIRED_ADVENTURER_MAX_HP,
  VILLAGER_STATS
} from './npcCombatStats'

describe('getNpcCombatStats', () => {
  it('returns fixed villager constants at 10 HP', () => {
    const stats = getNpcCombatStats('villager')
    expect(stats).toEqual(VILLAGER_STATS)
    expect(stats.hp).toBe(10)
    expect(stats.ac).toBe(10)
    expect(stats.attackBonus).toBe(0)
    expect(stats.damageRoll).toEqual({ diceCount: 1, diceSize: 4, modifier: 0 })
  })

  it('maps retired adventurer profiles to combat stats with hit-die HP at hydration', () => {
    const brawlerHp = computeRetiredAdventurerHp('npc-brawler', 'brawler')
    const veteranHp = computeRetiredAdventurerHp('npc-veteran', 'veteran')
    const brawler = getNpcCombatStats('retired_adventurer', 'brawler')
    const skirmisher = getNpcCombatStats('retired_adventurer', 'skirmisher')
    const veteran = getNpcCombatStats('retired_adventurer', 'veteran')

    expect(brawlerHp.maxHp).toBeGreaterThan(VILLAGER_STATS.hp)
    expect(skirmisher.ac).toBeGreaterThan(VILLAGER_STATS.ac)
    expect(veteranHp.maxHp).toBeLessThanOrEqual(RETIRED_ADVENTURER_MAX_HP)
    expect(veteran.ac).toBeLessThanOrEqual(RETIRED_ADVENTURER_MAX_AC)
    expect(brawler.ac).toBe(14)
    expect(skirmisher.ac).toBe(15)
    expect(veteran.ac).toBe(16)
  })

  it('falls back to villager when retired profile is missing', () => {
    expect(getNpcCombatStats('retired_adventurer')).toEqual(VILLAGER_STATS)
  })
})
