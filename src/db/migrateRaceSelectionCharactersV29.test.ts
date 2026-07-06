import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCharacter } from './repositories/characters'
import { createCampaign } from './repositories/campaigns'
import { createCampaignRace, getCampaignRaceByKey, listCampaignRaces } from './repositories/campaignRaces'
import { createNpc, getNpcById } from './repositories/npcs'
import { createRegion } from './repositories/regions'
import { readGuidedCreationFields } from './repositories/guidedCreation'

const SAMPLE_LORE = {
  summary: 'Elves here are reclusive.',
  appearance: 'Slender.',
  culture: 'Forest-bound.',
  roleInThisLand: 'Keepers.',
  hooks: ['A grove dies.']
}

describe('race selection characters migration phase default (049.2)', () => {
  it('defaults new player characters to race guided-creation phase', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'M',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    expect(readGuidedCreationFields(db, player.id)?.guidedCreationPhase).toBe('race')
  })
})

describe('race selection characters migration catalog (049.2)', () => {
  it('round-trips campaign_races catalog rows', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'M',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    createCampaignRace(db, {
      campaignId: campaign.id,
      raceKey: 'elf',
      kind: 'preset',
      label: 'Elf',
      seedPrompt: 'Long-lived.',
      lore: SAMPLE_LORE,
      createdByCharacterId: player.id
    })
    const listed = listCampaignRaces(db, campaign.id)
    expect(listed).toHaveLength(1)
    expect(getCampaignRaceByKey(db, campaign.id, 'elf')?.lore.summary).toBe(SAMPLE_LORE.summary)
  })
})

describe('race selection characters migration race_key columns (049.2)', () => {
  it('round-trips race_key on characters and npcs', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'M',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'R' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      raceKey: 'human'
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'clerk',
      disposition: 'friendly',
      raceKey: 'elf'
    })
    expect(player.raceKey).toBe('human')
    expect(getNpcById(db, npc.id)?.raceKey).toBe('elf')
  })
})
