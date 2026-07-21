import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createLogEntry } from '../db/repositories/logEntries'
import { bumpNpcPlayerInteractionAt, createNpc, updateNpcOpinionSummary } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
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
