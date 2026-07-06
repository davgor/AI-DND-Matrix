import { describe, expect, it } from 'vitest'
import type { RaceCategory } from '../../shared/raceSelection/types'
import { CUSTOM_RACE_KEY, RACE_ROSTER } from './roster'

const ALL_CATEGORIES: RaceCategory[] = [
  'common_folk',
  'outsider_bloodlines',
  'monstrous_feral',
  'uncanny_otherworldly'
]

describe('RACE_ROSTER', () => {
  it('has 20 predefined entries with complete fields', () => {
    expect(RACE_ROSTER).toHaveLength(20)
    for (const entry of RACE_ROSTER) {
      expect(entry.key.length).toBeGreaterThan(0)
      expect(entry.label.length).toBeGreaterThan(0)
      expect(entry.seedPrompt.length).toBeGreaterThan(0)
      expect(ALL_CATEGORIES).toContain(entry.category)
    }
  })

  it('represents all four categories', () => {
    const seen = new Set(RACE_ROSTER.map((entry) => entry.category))
    for (const category of ALL_CATEGORIES) {
      expect(seen.has(category), `missing category ${category}`).toBe(true)
    }
  })

  it('uses stable lower_snake_case keys without duplicates', () => {
    const keys = RACE_ROSTER.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) {
      expect(key).toMatch(/^[a-z][a-z0-9_]*$/)
    }
  })

  it('does not include the custom sentinel in the roster', () => {
    expect(RACE_ROSTER.some((entry) => entry.key === CUSTOM_RACE_KEY)).toBe(false)
    expect(CUSTOM_RACE_KEY).toBe('custom')
  })
})
