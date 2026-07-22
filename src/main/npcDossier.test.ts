import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createLogEntry } from '../db/repositories/logEntries'
import {
  bumpNpcPlayerInteractionAt,
  createNpc,
  updateNpcFaceTokenPath,
  updateNpcOpinionSummary
} from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createBestiarySpecies } from '../db/repositories/bestiary'
import { persistNpcFaceTokenAsset } from './npcFaceTokenAsset'
import { persistCreatureTokenAsset } from './creatureTokenAsset'
import { getNpcDossier } from './npcDossier'

function seedDossierFixture(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Dossier Test',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A village.'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  const otherHero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Ally',
    characterClass: 'cleric',
    kind: 'player'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'innkeeper',
    disposition: 'warm toward the party',
    temperament: 'neutral',
    raceKey: 'human',
    alignment: 'neutral_good'
  })
  return { campaign, hero, otherHero, npc }
}

function seedHeroNpcLogEntries(
  db: ReturnType<typeof createTestDb>,
  fixture: ReturnType<typeof seedDossierFixture>
): ReturnType<typeof createLogEntry> {
  const { campaign, hero, otherHero, npc } = fixture
  const linked = createLogEntry(db, {
    campaignId: campaign.id,
    characterId: hero.id,
    category: 'person',
    title: 'Mira',
    content: 'Runs the Oak & Ember.',
    relatedEntityId: npc.id,
    learnedInGameDate: 2,
    createdAt: '2026-07-02T00:00:00.000Z'
  })
  createLogEntry(db, {
    campaignId: campaign.id,
    characterId: hero.id,
    category: 'place',
    title: 'Bridge',
    content: 'A rickety bridge.',
    relatedEntityId: null,
    learnedInGameDate: 1
  })
  createLogEntry(db, {
    campaignId: campaign.id,
    characterId: hero.id,
    category: 'person',
    title: 'Other NPC',
    content: 'Unrelated person.',
    relatedEntityId: 'some-other-npc',
    learnedInGameDate: 3
  })
  createLogEntry(db, {
    campaignId: campaign.id,
    characterId: otherHero.id,
    category: 'person',
    title: 'Mira (ally note)',
    content: 'Ally saw Mira too.',
    relatedEntityId: npc.id,
    learnedInGameDate: 4
  })
  return linked
}

describe('getNpcDossier: access control', () => {
  it('returns null when the NPC is missing', async () => {
    const db = createTestDb()
    const { campaign, hero } = seedDossierFixture(db)

    const dossier = await getNpcDossier(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npcId: 'missing-npc'
    })

    expect(dossier).toBeNull()
  })

  it('returns null when the NPC belongs to another campaign', async () => {
    const db = createTestDb()
    const { hero, npc } = seedDossierFixture(db)
    const otherCampaign = createCampaign(db, {
      name: 'Other',
      premisePrompt: 'other',
      deathMode: 'legendary'
    })

    const dossier = await getNpcDossier(db, {
      campaignId: otherCampaign.id,
      characterId: hero.id,
      npcId: npc.id
    })

    expect(dossier).toBeNull()
  })
})

describe('getNpcDossier: NPC appearance traits', () => {
  it('includes hair, age, and eye color on traits when set', async () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedDossierFixture(db)
    const withAppearance = createNpc(db, {
      campaignId: campaign.id,
      regionId: npc.regionId,
      name: 'Elara',
      role: 'herbalist',
      disposition: 'curious',
      hairColor: 'silver',
      age: 'elderly',
      eyeColor: 'blue'
    })

    const dossier = await getNpcDossier(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npcId: withAppearance.id
    })

    expect(dossier?.traits.hairColor).toBe('silver')
    expect(dossier?.traits.age).toBe('elderly')
    expect(dossier?.traits.eyeColor).toBe('blue')
  })

  it('defaults appearance traits to null when unset', async () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedDossierFixture(db)

    const dossier = await getNpcDossier(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npcId: npc.id
    })

    expect(dossier?.traits.hairColor).toBeNull()
    expect(dossier?.traits.age).toBeNull()
    expect(dossier?.traits.eyeColor).toBeNull()
    expect(dossier?.traits.silhouette).toBeNull()
    expect(dossier?.traits.primaryColors).toEqual([])
  })
})

describe('getNpcDossier: species appearance traits', () => {
  it('surfaces bestiary species appearance when NPC links to a species', async () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedDossierFixture(db)
    const species = createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'rift-beast',
      name: 'Rift-beast',
      baseLore: 'Planar predators.',
      visualAppearance: {
        silhouette: 'quadruped wolf-like',
        sizeClass: 'large',
        primaryColors: ['violet'],
        distinguishingMarks: 'rift scars',
        textureOrMaterial: 'crackling fur'
      },
      buckets: ['beast'],
      tags: ['rift']
    })
    const foe = createNpc(db, {
      campaignId: campaign.id,
      regionId: npc.regionId,
      name: 'Scarred Rift-beast',
      role: 'hostile',
      disposition: 'hostile',
      canSpeak: false,
      bestiarySpeciesId: species.id,
      bestiaryVariantKey: 'standard'
    })

    const dossier = await getNpcDossier(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npcId: foe.id
    })

    expect(dossier?.traits.silhouette).toBe('quadruped wolf-like')
    expect(dossier?.traits.sizeClass).toBe('large')
    expect(dossier?.traits.primaryColors).toEqual(['violet'])
    expect(dossier?.traits.distinguishingMarks).toBe('rift scars')
    expect(dossier?.traits.textureOrMaterial).toBe('crackling fur')
  })
})

describe('getNpcDossier: facts', () => {
  it('includes only log entries linked to the NPC for the active character', async () => {
    const db = createTestDb()
    const fixture = seedDossierFixture(db)
    const { campaign, hero, npc } = fixture
    const linked = seedHeroNpcLogEntries(db, fixture)

    const dossier = await getNpcDossier(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npcId: npc.id
    })

    expect(dossier?.facts).toEqual([
      {
        id: linked.id,
        title: 'Mira',
        content: 'Runs the Oak & Ember.',
        createdAt: linked.createdAt
      }
    ])
    expect(dossier?.disposition).toBe('warm toward the party')
    expect(dossier?.traits.role).toBe('innkeeper')
  })
})

describe('getNpcDossier: opinion watermark', () => {
  it('returns stored opinion without calling generateOpinion when watermark is fresh', async () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedDossierFixture(db)
    const generatedAt = '2026-07-20T12:00:00.000Z'
    updateNpcOpinionSummary(db, npc.id, {
      summary: 'Glad the party stopped by.',
      generatedAt
    })
    bumpNpcPlayerInteractionAt(db, npc.id, '2026-07-20T11:00:00.000Z')

    const generateOpinion = vi.fn(async () => 'Should not run')

    const first = await getNpcDossier(
      db,
      { campaignId: campaign.id, characterId: hero.id, npcId: npc.id },
      { generateOpinion }
    )
    const second = await getNpcDossier(
      db,
      { campaignId: campaign.id, characterId: hero.id, npcId: npc.id },
      { generateOpinion }
    )

    expect(generateOpinion).not.toHaveBeenCalled()
    expect(first?.opinion).toEqual({
      summary: 'Glad the party stopped by.',
      generatedAt,
      stale: false
    })
    expect(second?.opinion).toEqual(first?.opinion)
  })
})

describe('getNpcDossier: face token path', () => {
  it('exposes resolved faceTokenPath when asset exists', async () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedDossierFixture(db)
    const baseDir = mkdtempSync(join(tmpdir(), 'dossier-face-token-'))
    try {
      const path = persistNpcFaceTokenAsset(db, {
        npcId: npc.id,
        campaignId: campaign.id,
        bytesBase64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        baseDir
      })

      const dossier = await getNpcDossier(db, {
        campaignId: campaign.id,
        characterId: hero.id,
        npcId: npc.id
      })

      expect(dossier?.faceTokenPath).toBe(path)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('returns null faceTokenPath when DB path points to a missing file', async () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedDossierFixture(db)
    updateNpcFaceTokenPath(db, npc.id, '/tmp/missing-face-token.png')

    const dossier = await getNpcDossier(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npcId: npc.id
    })

    expect(dossier?.faceTokenPath).toBeNull()
  })

  it('defaults faceTokenPath to null when unset', async () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedDossierFixture(db)

    const dossier = await getNpcDossier(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      npcId: npc.id
    })

    expect(dossier?.faceTokenPath).toBeNull()
  })
})

const DOSSIER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function seedGrayWolfSpecies(db: ReturnType<typeof createTestDb>, campaignId: string) {
  return createBestiarySpecies(db, {
    campaignId,
    key: 'gray-wolf',
    name: 'Gray Wolf',
    baseLore: 'Pack hunters.',
    buckets: ['beast'],
    tags: ['wolf']
  })
}

function createGrayWolfFoe(
  db: ReturnType<typeof createTestDb>,
  fixture: ReturnType<typeof seedDossierFixture>,
  speciesId: string
) {
  return createNpc(db, {
    campaignId: fixture.campaign.id,
    regionId: fixture.npc.regionId,
    name: 'Gray Wolf',
    role: 'enemy',
    disposition: 'hostile',
    canSpeak: false,
    bestiarySpeciesId: speciesId,
    bestiaryVariantKey: 'standard'
  })
}

describe('getNpcDossier: species creature token path', () => {
  it('exposes resolved species creature token for non-speaking enemy instances', async () => {
    const db = createTestDb()
    const fixture = seedDossierFixture(db)
    const species = seedGrayWolfSpecies(db, fixture.campaign.id)
    const foe = createGrayWolfFoe(db, fixture, species.id)
    const baseDir = mkdtempSync(join(tmpdir(), 'dossier-creature-token-'))
    try {
      const path = persistCreatureTokenAsset(db, {
        speciesId: species.id,
        campaignId: fixture.campaign.id,
        bytesBase64: DOSSIER_PNG_BASE64,
        mimeType: 'image/png',
        baseDir
      })

      const dossier = await getNpcDossier(db, {
        campaignId: fixture.campaign.id,
        characterId: fixture.hero.id,
        npcId: foe.id
      })

      expect(dossier?.faceTokenPath).toBe(path)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('getNpcDossier: species creature token precedence', () => {
  it('prefers NPC face token over species creature token for speaking NPCs', async () => {
    const db = createTestDb()
    const fixture = seedDossierFixture(db)
    const species = seedGrayWolfSpecies(db, fixture.campaign.id)
    db.prepare('UPDATE npcs SET bestiary_species_id = ? WHERE id = ?').run(species.id, fixture.npc.id)
    const baseDir = mkdtempSync(join(tmpdir(), 'dossier-token-precedence-'))
    try {
      persistCreatureTokenAsset(db, {
        speciesId: species.id,
        campaignId: fixture.campaign.id,
        bytesBase64: DOSSIER_PNG_BASE64,
        mimeType: 'image/png',
        baseDir
      })
      const facePath = persistNpcFaceTokenAsset(db, {
        npcId: fixture.npc.id,
        campaignId: fixture.campaign.id,
        bytesBase64: DOSSIER_PNG_BASE64,
        mimeType: 'image/png',
        baseDir
      })

      const dossier = await getNpcDossier(db, {
        campaignId: fixture.campaign.id,
        characterId: fixture.hero.id,
        npcId: fixture.npc.id
      })

      expect(dossier?.faceTokenPath).toBe(facePath)
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})

describe('getNpcDossier: missing species creature token', () => {
  it('returns null when species creature token path points to a missing file', async () => {
    const db = createTestDb()
    const fixture = seedDossierFixture(db)
    const species = seedGrayWolfSpecies(db, fixture.campaign.id)
    db.prepare('UPDATE bestiary_species SET creature_token_path = ? WHERE id = ?').run(
      '/tmp/missing-creature-token.png',
      species.id
    )
    const foe = createGrayWolfFoe(db, fixture, species.id)

    const dossier = await getNpcDossier(db, {
      campaignId: fixture.campaign.id,
      characterId: fixture.hero.id,
      npcId: foe.id
    })

    expect(dossier?.faceTokenPath).toBeNull()
  })
})

describe('getNpcDossier: opinion regeneration', () => {
  it('regenerates and persists opinion when interaction watermark is stale', async () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedDossierFixture(db)
    updateNpcOpinionSummary(db, npc.id, {
      summary: 'Old opinion.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })
    bumpNpcPlayerInteractionAt(db, npc.id, '2026-07-20T13:00:00.000Z')

    const generateOpinion = vi.fn(async () => 'Updated after new dialogue.')

    const dossier = await getNpcDossier(
      db,
      { campaignId: campaign.id, characterId: hero.id, npcId: npc.id },
      { generateOpinion }
    )

    expect(generateOpinion).toHaveBeenCalledTimes(1)
    expect(dossier?.opinion.summary).toBe('Updated after new dialogue.')
    expect(dossier?.opinion.stale).toBe(false)
    expect(dossier?.opinion.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('keeps previous summary with stale true when regeneration fails', async () => {
    const db = createTestDb()
    const { campaign, hero, npc } = seedDossierFixture(db)
    updateNpcOpinionSummary(db, npc.id, {
      summary: 'Previous summary.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })
    bumpNpcPlayerInteractionAt(db, npc.id, '2026-07-20T13:00:00.000Z')

    const dossier = await getNpcDossier(
      db,
      { campaignId: campaign.id, characterId: hero.id, npcId: npc.id },
      { generateOpinion: async () => null }
    )

    expect(dossier?.opinion.summary).toBe('Previous summary.')
    expect(dossier?.opinion.stale).toBe(true)
  })
})
