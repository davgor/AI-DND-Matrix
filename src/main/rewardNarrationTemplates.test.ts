import { describe, expect, it } from 'vitest'
import { formatItemNameList, lootNarrationTemplate } from './rewardNarrationTemplates'

describe('formatItemNameList', () => {
  it('handles one, two, and three names grammatically', () => {
    expect(formatItemNameList(['Dagger'])).toBe('Dagger')
    expect(formatItemNameList(['Dagger', 'Mace'])).toBe('Dagger and Mace')
    expect(formatItemNameList(['Dagger', 'Mace', 'Rope'])).toBe('Dagger, Mace and Rope')
  })

  it('returns empty string for no names', () => {
    expect(formatItemNameList([])).toBe('')
  })
})

describe('lootNarrationTemplate', () => {
  it('embeds all grant names in a single sentence', () => {
    const line = lootNarrationTemplate('encounter_end', ['Wolf Fang', 'Rough Hide'])
    expect(line).toContain('Wolf Fang')
    expect(line).toContain('Rough Hide')
    expect(line.endsWith('.')).toBe(true)
    expect(line).not.toContain('\n')
  })

  it('differs per source type', () => {
    const encounter = lootNarrationTemplate('encounter_end', ['Coin Pouch'])
    const quest = lootNarrationTemplate('quest_complete', ['Coin Pouch'])
    expect(encounter).not.toBe(quest)
  })

  it('produces a nothing-found one-liner per source when empty', () => {
    const encounter = lootNarrationTemplate('encounter_end', [])
    const quest = lootNarrationTemplate('quest_complete', [])
    expect(encounter).not.toBe(quest)
    expect(encounter.endsWith('.')).toBe(true)
    expect(quest.endsWith('.')).toBe(true)
  })
})
