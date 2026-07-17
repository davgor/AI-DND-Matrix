import { describe, expect, it } from 'vitest'
import {
  buildAvailableRaceOptions,
  buildRaceLorePrompt,
  generateRaceLore
} from './raceLore'
import { RACE_ROSTER } from '../engine/raceSelection/roster'
import { createScriptedProvider } from './providers/mockHarness'
import type { CampaignRace, RaceLore } from '../shared/raceSelection/types'

const VALID_LORE: RaceLore = {
  summary: 'Humans are everywhere.',
  appearance: 'Varied.',
  culture: 'Ambitious.',
  roleInThisLand: 'Settlers.',
  hooks: ['A frontier town grows.']
}

describe('buildRaceLorePrompt', () => {
  it('marks campaign premise and custom seed as untrusted narrative content', () => {
    const prompt = buildRaceLorePrompt('A flooded kingdom.', 'Recent storms.', {
      kind: 'custom',
      label: 'Marshfolk',
      seedPrompt: 'Amphibious traders.'
    })
    expect(prompt).toContain('untrusted narrative content')
    expect(prompt).toContain('Amphibious traders.')
    expect(prompt).toContain('A flooded kingdom.')
  })

  it('asks for plain English fantasy appearance and culture', () => {
    const prompt = buildRaceLorePrompt('A flooded kingdom.', 'Recent storms.', {
      kind: 'custom',
      label: 'Marshfolk',
      seedPrompt: 'Amphibious traders.'
    })
    expect(prompt).toContain('standard English')
    expect(prompt).toContain('fog-dwellers')
  })

  it('includes preset seed prompt for predefined races', () => {
    const entry = RACE_ROSTER[0]!
    const prompt = buildRaceLorePrompt('Premise.', 'Summary.', {
      kind: 'preset',
      raceKey: entry.key,
      label: entry.label,
      seedPrompt: entry.seedPrompt
    })
    expect(prompt).toContain(entry.seedPrompt)
  })
})

describe('generateRaceLore', () => {
  it('parses valid lore JSON and retries malformed output', async () => {
    const provider = createScriptedProvider(['not json', JSON.stringify(VALID_LORE)])
    const lore = await generateRaceLore(provider, 'Premise.', 'Summary.', {
      kind: 'preset',
      raceKey: 'human',
      label: 'Human',
      seedPrompt: 'Adaptable.'
    })
    expect(lore.summary).toBe(VALID_LORE.summary)
    expect(provider.calls).toHaveLength(2)
  })

  it('caps output at the structured-lore band and reuses the context on retries (040.1)', async () => {
    const provider = createScriptedProvider(['not json', JSON.stringify(VALID_LORE)])
    await generateRaceLore(provider, 'Premise.', 'Summary.', {
      kind: 'preset',
      raceKey: 'human',
      label: 'Human',
      seedPrompt: 'Adaptable.'
    })
    expect(provider.calls[0]?.context?.maxTokens).toBe(512)
    expect(provider.calls[1]?.context).toBe(provider.calls[0]?.context)
  })
})

describe('buildAvailableRaceOptions', () => {
  it('uses seed prompt for unrealized presets', () => {
    const human = RACE_ROSTER.find((entry) => entry.key === 'human')!
    const options = buildAvailableRaceOptions([])
    const humanOption = options.find((option) => option.key === 'human')
    expect(humanOption?.blurb).toBe(human.seedPrompt)
  })

  it('overrides preset blurbs with locked lore summary', () => {
    const locked: CampaignRace = {
      id: '1',
      campaignId: 'c',
      raceKey: 'elf',
      kind: 'preset',
      label: 'Elf',
      seedPrompt: 'Long-lived.',
      lore: VALID_LORE,
      createdByCharacterId: null,
      createdAt: '2026-01-01T00:00:00.000Z'
    }
    const options = buildAvailableRaceOptions([locked])
    expect(options.find((option) => option.key === 'elf')?.blurb).toBe(VALID_LORE.summary)
  })

  it('includes custom campaign races', () => {
    const custom: CampaignRace = {
      id: '2',
      campaignId: 'c',
      raceKey: 'custom_abc',
      kind: 'custom',
      label: 'Crystalfolk',
      seedPrompt: 'Living gems.',
      lore: VALID_LORE,
      createdByCharacterId: null,
      createdAt: '2026-01-01T00:00:00.000Z'
    }
    const options = buildAvailableRaceOptions([custom])
    expect(options.some((option) => option.key === 'custom_abc')).toBe(true)
  })
})
