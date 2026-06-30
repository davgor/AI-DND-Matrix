import { describe, it, expect } from 'vitest'
import { LOOT_EXEMPLAR_TABLE } from './lootProfiles'

describe('LOOT_EXEMPLAR_TABLE', () => {
  it('covers beast, humanoid, undead, quest_reward_minor, quest_reward_major buckets', () => {
    const keys = Object.keys(LOOT_EXEMPLAR_TABLE)
    expect(keys).toEqual(
      expect.arrayContaining(['beast', 'humanoid', 'undead', 'quest_reward_minor', 'quest_reward_major'])
    )
  })

  it('beast profiles contain zero weapon entries', () => {
    const weaponEntries = LOOT_EXEMPLAR_TABLE.beast.filter((e) => e.itemType === 'weapon')
    expect(weaponEntries).toHaveLength(0)
  })

  it('every exemplar has required fields', () => {
    for (const entries of Object.values(LOOT_EXEMPLAR_TABLE)) {
      for (const exemplar of entries) {
        expect(exemplar.name.length).toBeGreaterThan(0)
        expect(exemplar.flavorHint.length).toBeGreaterThan(0)
      }
    }
  })
})
