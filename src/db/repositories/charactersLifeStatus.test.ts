import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import {
  createCharacter,
  getCharacterById,
  markCharacterDead,
  setCharacterObituary
} from './characters'
import type { CharacterObituary } from '../../shared/campaignHub/types'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
}

const sampleObituary: CharacterObituary = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  deathCause: 'legendary_dying',
  narrativeBody: 'They fell bravely.',
  npcReactions: []
}

describe('characters repository: life status defaults (038.2)', () => {
  it('defaults existing player characters to alive on migration', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const created = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Elowen',
      characterClass: 'Ranger',
      kind: 'player'
    })

    const fetched = getCharacterById(db, created.id)
    expect(fetched?.lifeStatus).toBe('alive')
    expect(fetched?.diedAt).toBeNull()
    expect(fetched?.deathCause).toBeNull()
    expect(fetched?.obituary).toBeNull()
  })

  it('round-trips death status and obituary', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const created = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Elowen',
      characterClass: 'Ranger',
      kind: 'player'
    })

    markCharacterDead(db, {
      characterId: created.id,
      deathCause: 'legendary_dying',
      obituary: sampleObituary
    })

    const fetched = getCharacterById(db, created.id)
    expect(fetched?.lifeStatus).toBe('dead')
    expect(fetched?.deathCause).toBe('legendary_dying')
    expect(fetched?.diedAt).toBeTruthy()
    expect(fetched?.obituary).toEqual(sampleObituary)
  })
})

describe('characters repository: obituary isolation (038.2)', () => {
  it('isolates obituary per character', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const a = createCharacter(db, {
      campaignId: campaign.id,
      name: 'A',
      characterClass: 'Fighter',
      kind: 'player'
    })
    const b = createCharacter(db, {
      campaignId: campaign.id,
      name: 'B',
      characterClass: 'Mage',
      kind: 'player'
    })

    markCharacterDead(db, {
      characterId: a.id,
      deathCause: 'story_sacrifice',
      obituary: sampleObituary
    })

    expect(getCharacterById(db, a.id)?.obituary).toEqual(sampleObituary)
    expect(getCharacterById(db, b.id)?.obituary).toBeNull()
  })

  it('setCharacterObituary updates obituary_json', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const created = createCharacter(db, {
      campaignId: campaign.id,
      name: 'A',
      characterClass: 'Fighter',
      kind: 'player'
    })

    setCharacterObituary(db, created.id, sampleObituary)
    expect(getCharacterById(db, created.id)?.obituary).toEqual(sampleObituary)
  })
})
