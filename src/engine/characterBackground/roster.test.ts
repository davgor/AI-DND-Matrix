import { describe, expect, it } from 'vitest'
import { BACKGROUND_ROSTER } from './roster'

const EXPECTED_KEYS = [
  'acolyte',
  'charlatan',
  'criminal',
  'street_thug',
  'entertainer',
  'folk_hero',
  'guild_artisan',
  'hermit',
  'noble',
  'outlander',
  'sage',
  'sailor',
  'soldier',
  'urchin',
  'merchant',
  'farmhand',
  'isekaid'
] as const

describe('BACKGROUND_ROSTER', () => {
  it('has 17 entries with complete fields', () => {
    expect(BACKGROUND_ROSTER).toHaveLength(17)
    for (const entry of BACKGROUND_ROSTER) {
      expect(entry.key.length).toBeGreaterThan(0)
      expect(entry.label.length).toBeGreaterThan(0)
      expect(entry.description.length).toBeGreaterThan(0)
    }
  })

  it('includes every expected key exactly once in stable lower_snake_case', () => {
    const keys = BACKGROUND_ROSTER.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) {
      expect(key).toMatch(/^[a-z][a-z0-9_]*$/)
    }
    expect([...keys].sort()).toEqual([...EXPECTED_KEYS].sort())
  })

  it('includes isekaid with the Isekai label', () => {
    const isekaid = BACKGROUND_ROSTER.find((entry) => entry.key === 'isekaid')
    expect(isekaid).toBeDefined()
    expect(isekaid?.label).toBe("Isekai'd")
    expect(isekaid?.description.length).toBeGreaterThan(0)
  })
})
