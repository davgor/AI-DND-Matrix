import { describe, expect, it } from 'vitest'
import { resolveRaceDisplayLabel } from './resolveLabel'

describe('resolveRaceDisplayLabel', () => {
  it('returns catalog label for custom races', () => {
    expect(
      resolveRaceDisplayLabel('custom_abc', [
        {
          id: '1',
          campaignId: 'c',
          raceKey: 'custom_abc',
          kind: 'custom',
          label: 'Starfolk',
          seedPrompt: 's',
          lore: {
            summary: 'x',
            appearance: 'x',
            culture: 'x',
            roleInThisLand: 'x',
            hooks: []
          },
          createdByCharacterId: null,
          createdAt: 't'
        }
      ])
    ).toBe('Starfolk')
  })

  it('falls back to roster label for unrealized presets', () => {
    expect(resolveRaceDisplayLabel('elf', [])).toBe('Elf')
  })

  it('returns null when race is unset', () => {
    expect(resolveRaceDisplayLabel(null)).toBeNull()
    expect(resolveRaceDisplayLabel(undefined)).toBeNull()
  })
})
