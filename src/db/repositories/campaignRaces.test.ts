import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import {
  createCampaignRace,
  getCampaignRaceByKey,
  listCampaignRaces,
  setCharacterRaceKey
} from './campaignRaces'
import { createCharacter, getCharacterById } from './characters'

const LORE = {
  summary: 'Dwarves are miners.',
  appearance: 'Stout.',
  culture: 'Clan-bound.',
  roleInThisLand: 'Delvers.',
  hooks: ['A shaft collapsed.']
}

describe('campaignRaces repository', () => {
  it('creates and reads campaign race rows with parsed lore JSON', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    const race = createCampaignRace(db, {
      campaignId: campaign.id,
      raceKey: 'dwarf',
      kind: 'preset',
      label: 'Dwarf',
      seedPrompt: 'Stout folk.',
      lore: LORE
    })
    expect(race.lore.hooks).toEqual(LORE.hooks)
    expect(getCampaignRaceByKey(db, campaign.id, 'dwarf')?.label).toBe('Dwarf')
    expect(listCampaignRaces(db, campaign.id)).toHaveLength(1)
  })

  it('sets character race_key via setCharacterRaceKey', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    setCharacterRaceKey(db, player.id, 'elf')
    expect(getCharacterById(db, player.id)?.raceKey).toBe('elf')
  })
})
