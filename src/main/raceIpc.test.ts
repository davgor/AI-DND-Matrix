import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createCampaignRace } from '../db/repositories/campaignRaces'
import { readGuidedCreationFields } from '../db/repositories/guidedCreation'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import {
  applyRaceSelection,
  getRaceRosterGrouped,
  previewRaceLore
} from './raceIpc'

const LORE = {
  summary: 'Elves are reclusive here.',
  appearance: 'Slender.',
  culture: 'Forest-bound.',
  roleInThisLand: 'Keepers.',
  hooks: ['A grove dies.']
}

describe('getRaceRosterGrouped', () => {
  it('returns categorized roster entries', () => {
    const groups = getRaceRosterGrouped()
    expect(groups.length).toBe(4)
    expect(groups.some((group) => group.entries.length > 0)).toBe(true)
  })
})

describe('previewRaceLore', () => {
  it('returns locked lore without an LLM call when already realized', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    createCampaignRace(db, {
      campaignId: campaign.id,
      raceKey: 'elf',
      kind: 'preset',
      label: 'Elf',
      seedPrompt: 'Long-lived.',
      lore: LORE
    })
    const provider = createScriptedProvider([JSON.stringify(LORE)])
    const result = await previewRaceLore(db, provider, {
      campaignId: campaign.id,
      kind: 'preset',
      raceKey: 'elf'
    })
    expect(result.locked).toBe(true)
    expect(result.lore.summary).toBe(LORE.summary)
    expect(provider.calls).toHaveLength(0)
  })

  it('generates fresh lore for unrealized presets', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    const provider = createScriptedProvider([JSON.stringify(LORE)])
    const result = await previewRaceLore(db, provider, {
      campaignId: campaign.id,
      kind: 'preset',
      raceKey: 'human'
    })
    expect(result.locked).toBe(false)
    expect(result.lore.summary).toBe(LORE.summary)
    expect(provider.calls).toHaveLength(1)
  })
})

describe('applyRaceSelection', () => {
  it('persists race and advances phase to background', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    const result = await applyRaceSelection(db, {
      campaignId: campaign.id,
      characterId: player.id,
      kind: 'preset',
      raceKey: 'human',
      label: 'Human',
      seedPrompt: 'Adaptable.',
      finalLore: LORE
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.raceKey).toBe('human')
      expect(getCharacterById(db, player.id)?.raceKey).toBe('human')
      expect(readGuidedCreationFields(db, player.id)?.guidedCreationPhase).toBe('background')
    }
  })
})
