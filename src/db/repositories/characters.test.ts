import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import {
  createCharacter,
  getCharacterById,
  listCharactersByCampaign,
  persistGeneratedCharacterPortrait,
  replaceCharacterPortraitWithUpload,
  updateCharacter,
  updateCharacterPortraitPath
} from './characters'
import { createNpc } from './npcs'
import { createRegion } from './regions'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
}

describe('characters repository: create + getById round-trip', () => {
  it('round-trips a player character with currency defaulting to 0 and null optional fields', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)

    const created = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Elowen',
      characterClass: 'Ranger',
      kind: 'player'
    })

    expect(getCharacterById(db, created.id)).toEqual(created)
    expect(created.currency).toBe(0)
    expect(created.sourceNpcId).toBeNull()
    expect(created.portraitPath).toBeNull()
    expect(created.sheetBackgroundPath).toBeNull()
    expect(created.stats).toEqual({})
    expect(created.inventory).toEqual([])
  })

  it('round-trips an ai_party_member character promoted from an NPC', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Oakhollow',
      description: '...'
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Bram',
      role: 'villager',
      disposition: 'friendly'
    })

    const created = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Bram',
      characterClass: 'Fighter',
      kind: 'ai_party_member',
      sourceNpcId: npc.id,
      portraitPath: '/portraits/bram.png'
    })

    const fetched = getCharacterById(db, created.id)
    expect(fetched?.kind).toBe('ai_party_member')
    expect(fetched?.sourceNpcId).toBe(npc.id)
    expect(fetched?.portraitPath).toBe('/portraits/bram.png')
  })
})

describe('characters repository: listByCampaign', () => {
  it('lists only characters belonging to the given campaign', () => {
    const db = createTestDb()
    const campaignA = seedCampaign(db)
    const campaignB = seedCampaign(db)

    const charA = createCharacter(db, {
      campaignId: campaignA.id,
      name: 'A',
      characterClass: 'Fighter',
      kind: 'player'
    })
    createCharacter(db, {
      campaignId: campaignB.id,
      name: 'B',
      characterClass: 'Fighter',
      kind: 'player'
    })

    expect(listCharactersByCampaign(db, campaignA.id).map((c) => c.id)).toEqual([charA.id])
  })
})

describe('characters repository: update', () => {
  it('updates stats, hp, xp, level, and inventory', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const created = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Elowen',
      characterClass: 'Ranger',
      kind: 'player'
    })

    updateCharacter(db, created.id, {
      stats: { body: 14, agility: 16 },
      hp: 22,
      xp: 150,
      level: 2,
      inventory: ['shortbow', 'leather armor']
    })

    const fetched = getCharacterById(db, created.id)
    expect(fetched?.stats).toEqual({ body: 14, agility: 16 })
    expect(fetched?.hp).toBe(22)
    expect(fetched?.xp).toBe(150)
    expect(fetched?.level).toBe(2)
    expect(fetched?.inventory).toEqual(['shortbow', 'leather armor'])
  })
})

describe('characters repository: updateCharacterPortraitPath', () => {
  it('persists portrait_path and survives reload', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const created = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Bryn',
      characterClass: 'ranger',
      kind: 'ai_party_member'
    })
    expect(created.portraitPath).toBeNull()
    updateCharacterPortraitPath(db, created.id, '/data/companion-face-tokens/c/bryn.png')
    expect(getCharacterById(db, created.id)?.portraitPath).toBe(
      '/data/companion-face-tokens/c/bryn.png'
    )
    updateCharacterPortraitPath(db, created.id, null)
    expect(getCharacterById(db, created.id)?.portraitPath).toBeNull()
  })
})

describe('characters repository: generated portrait prompt lifecycle', () => {
  it('persists path + prompt and clears prompt on clean upload replace', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const created = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      characterClass: 'ranger',
      kind: 'player'
    })
    persistGeneratedCharacterPortrait(
      db,
      created.id,
      '/data/portraits/kael.png',
      'scarred ash-blond ranger'
    )
    const generated = getCharacterById(db, created.id)
    expect(generated?.portraitPath).toBe('/data/portraits/kael.png')
    expect(generated?.portraitPrompt).toBe('scarred ash-blond ranger')

    replaceCharacterPortraitWithUpload(db, created.id, '/data/portraits/upload.png')
    const replaced = getCharacterById(db, created.id)
    expect(replaced?.portraitPath).toBe('/data/portraits/upload.png')
    expect(replaced?.portraitPrompt).toBeNull()
  })

  it('failed regen path: leave existing portrait when only a failed attempt occurs', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const created = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      characterClass: 'ranger',
      kind: 'player',
      portraitPath: '/data/portraits/good.png',
      portraitPrompt: 'keep me'
    })
    // Simulate failed regen by not calling persistGeneratedCharacterPortrait
    expect(getCharacterById(db, created.id)?.portraitPath).toBe('/data/portraits/good.png')
    expect(getCharacterById(db, created.id)?.portraitPrompt).toBe('keep me')
  })
})
