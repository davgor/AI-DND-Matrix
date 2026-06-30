import { describe, expect, it } from 'vitest'
import { persistNarrationSideEffects } from './dm'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { listLogEntriesByCharacter } from '../db/repositories/logEntries'
import { createRegion } from '../db/repositories/regions'

function seedTwoPlayers() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Encounter Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Market',
    description: 'Busy stalls.'
  })
  const active = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player'
  })
  const inactive = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Lyra',
    characterClass: 'mage',
    kind: 'player'
  })
  return { db, campaign, region, active, inactive }
}

describe('persistNarrationSideEffects paired cross-character log (038.15)', () => {
  it('persists paired entries to both character ids in one transaction', () => {
    const { db, campaign, region, active, inactive } = seedTwoPlayers()
    persistNarrationSideEffects(
      db,
      {
        narrationText: 'The two heroes meet at the market.',
        crossCharacterLogBookEntries: [
          {
            characterId: active.id,
            category: 'event',
            title: 'Met Lyra',
            content: 'Ran into Lyra at the market.'
          },
          {
            characterId: inactive.id,
            category: 'event',
            title: 'Met Kael',
            content: 'Kael appeared among the stalls.'
          },
          {
            characterId: active.id,
            category: 'invalid' as 'event',
            title: 'Dropped',
            content: 'Bad category.'
          }
        ]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: active.id }
    )

    expect(listLogEntriesByCharacter(db, active.id)).toHaveLength(1)
    expect(listLogEntriesByCharacter(db, inactive.id)).toHaveLength(1)
    expect(listLogEntriesByCharacter(db, active.id)[0]?.title).toBe('Met Lyra')
    expect(listLogEntriesByCharacter(db, inactive.id)[0]?.title).toBe('Met Kael')
  })
})

describe('persistNarrationSideEffects isolated cross-character log (038.15)', () => {
  it('isolates each character list API to its own entries', () => {
    const { db, campaign, region, active, inactive } = seedTwoPlayers()
    persistNarrationSideEffects(
      db,
      {
        narrationText: 'Brief exchange.',
        logBookEntries: [{ category: 'person', title: 'Lyra', content: 'A fellow adventurer.' }],
        crossCharacterLogBookEntries: [
          {
            characterId: inactive.id,
            category: 'person',
            title: 'Kael',
            content: 'A stern fighter.'
          }
        ]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: active.id }
    )

    const activeEntries = listLogEntriesByCharacter(db, active.id)
    const inactiveEntries = listLogEntriesByCharacter(db, inactive.id)
    expect(activeEntries.every((entry) => entry.characterId === active.id)).toBe(true)
    expect(inactiveEntries.every((entry) => entry.characterId === inactive.id)).toBe(true)
    expect(activeEntries.map((e) => e.title)).toEqual(['Lyra'])
    expect(inactiveEntries.map((e) => e.title)).toEqual(['Kael'])
  })
})
