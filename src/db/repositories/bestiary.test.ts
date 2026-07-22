import { describe, expect, it } from 'vitest'
import type { CompositionPlan } from '../../shared/bestiary/types'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import {
  createBestiarySpecies,
  getBestiarySpeciesById,
  getBestiarySpeciesByKey,
  listBestiarySpecies,
  listBestiaryVariants,
  listQuestFoeAssignments,
  setQuestFoeAssignment,
  upsertBestiaryVariant
} from './bestiary'
import { createNpc, getNpcById, setNpcBestiaryLink } from './npcs'
import { createQuest } from './quests'
import { createRegion } from './regions'
import { deleteCampaignCascade } from './deleteCampaign'

const SAMPLE_COMPOSITION: CompositionPlan = {
  slots: [
    { speciesKey: 'rift-beast', variantKey: 'standard', count: 2 },
    { speciesKey: 'rift-beast', variantKey: 'alpha', count: 1 }
  ],
  budgetSpent: 5,
  budgetMax: 8,
  thematicSignal: 'rift'
}

type TestDb = ReturnType<typeof createTestDb>

function seedCampaign(db: TestDb) {
  const campaign = createCampaign(db, {
    name: 'Bestiary Test',
    premisePrompt: 'Rift beasts roam the wilds.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Wilds',
    description: 'Open country'
  })
  return { campaign, region }
}

function createRiftBeastSpecies(db: TestDb, campaignId: string) {
  return createBestiarySpecies(db, {
    campaignId,
    key: 'rift-beast',
    name: 'Rift-beast',
    baseLore: 'Born of torn planar fabric, they hunt in packs near rifts.',
    visualAppearance: {
      silhouette: 'quadruped wolf-like',
      sizeClass: 'large',
      primaryColors: ['violet'],
      distinguishingMarks: 'rift scars',
      textureOrMaterial: 'crackling fur'
    },
    buckets: ['beast'],
    tags: ['rift', 'pack'],
    defaultCatalogKey: 'wolf',
    variants: [
      { variantKey: 'standard', flavorBlurb: 'Common pack hunter' },
      {
        variantKey: 'alpha',
        catalogKeyOverride: 'dire-wolf',
        modifierProfileId: 'elevated',
        flavorBlurb: 'Pack leader'
      }
    ]
  })
}

function expectSpeciesRoundTrip(db: TestDb, created: ReturnType<typeof createRiftBeastSpecies>): void {
  expect(created.id).toBeTruthy()
  expect(created.key).toBe('rift-beast')
  expect(created.name).toBe('Rift-beast')
  expect(created.baseLore).toContain('planar')
  expect(created.buckets).toEqual(['beast'])
  expect(created.tags).toEqual(['rift', 'pack'])
  expect(created.defaultCatalogKey).toBe('wolf')
  expect(getBestiarySpeciesById(db, created.id)).toEqual(created)
  expect(getBestiarySpeciesByKey(db, created.campaignId, 'rift-beast')).toEqual(created)
  expect(listBestiarySpecies(db, created.campaignId)).toEqual([created])
}

function expectInitialVariants(db: TestDb, speciesId: string): void {
  const variants = listBestiaryVariants(db, speciesId)
  expect(variants).toHaveLength(2)
  expect(variants).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        variantKey: 'standard',
        flavorBlurb: 'Common pack hunter'
      }),
      expect.objectContaining({
        variantKey: 'alpha',
        catalogKeyOverride: 'dire-wolf',
        modifierProfileId: 'elevated',
        flavorBlurb: 'Pack leader'
      })
    ])
  )
}

function expectVariantUpsert(db: TestDb, speciesId: string): void {
  const upserted = upsertBestiaryVariant(db, speciesId, {
    variantKey: 'cursed',
    flavorBlurb: 'Blight-touched',
    catalogKeyOverride: 'shadow-wolf'
  })
  expect(upserted.variantKey).toBe('cursed')
  expect(listBestiaryVariants(db, speciesId)).toHaveLength(3)
  const updated = upsertBestiaryVariant(db, speciesId, {
    variantKey: 'cursed',
    flavorBlurb: 'Deeply blighted',
    catalogKeyOverride: 'shadow-wolf',
    modifierProfileId: 'thematic'
  })
  expect(updated.flavorBlurb).toBe('Deeply blighted')
  expect(updated.modifierProfileId).toBe('thematic')
  expect(listBestiaryVariants(db, speciesId)).toHaveLength(3)
}

describe('bestiary species repository', () => {
  it('creates species + variants and round-trips by id and by (campaignId, key)', () => {
    const db = createTestDb()
    const { campaign } = seedCampaign(db)
    const created = createRiftBeastSpecies(db, campaign.id)
    expect(created.campaignId).toBe(campaign.id)
    expect(created.createdAt).toBeTruthy()
    expect(created.updatedAt).toBeTruthy()
    expect(created.visualAppearance?.silhouette).toBe('quadruped wolf-like')
    expectSpeciesRoundTrip(db, created)
    expectInitialVariants(db, created.id)
    expectVariantUpsert(db, created.id)
  })

  it('legacy species without appearance round-trips with null visualAppearance', () => {
    const db = createTestDb()
    const { campaign } = seedCampaign(db)
    const created = createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'legacy-wolf',
      name: 'Legacy wolf',
      baseLore: 'Old row without appearance.',
      buckets: ['beast'],
      tags: ['wolf']
    })
    expect(created.visualAppearance).toBeNull()
    expect(getBestiarySpeciesById(db, created.id)?.visualAppearance).toBeNull()
  })

  it('invalid visual_appearance_json reads as null', () => {
    const db = createTestDb()
    const { campaign } = seedCampaign(db)
    const created = createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'broken-appearance',
      name: 'Broken',
      baseLore: 'Corrupt appearance json.',
      buckets: ['beast'],
      tags: []
    })
    db.prepare('UPDATE bestiary_species SET visual_appearance_json = ? WHERE id = ?').run(
      '{not json',
      created.id
    )
    expect(getBestiarySpeciesById(db, created.id)?.visualAppearance).toBeNull()
  })
})

function seedTwoSpeciesAndQuest(db: TestDb, campaignId: string) {
  const speciesA = createBestiarySpecies(db, {
    campaignId,
    key: 'rift-beast',
    name: 'Rift-beast',
    baseLore: 'Lore A.',
    buckets: ['beast'],
    tags: ['rift']
  })
  const speciesB = createBestiarySpecies(db, {
    campaignId,
    key: 'blue-slime',
    name: 'Blue slime',
    baseLore: 'Lore B.',
    buckets: ['elemental'],
    tags: ['slime']
  })
  const quest = createQuest(db, {
    campaignId,
    kind: 'side',
    title: 'Clear the rift',
    summary: 'Drive out the beasts.',
    scale: 'minor'
  })
  return { speciesA, speciesB, quest }
}

describe('quest foe assignments repository', () => {
  it('round-trips quest foe assignments with optional composition JSON (replace-all)', () => {
    const db = createTestDb()
    const { campaign } = seedCampaign(db)
    const { speciesA, speciesB, quest } = seedTwoSpeciesAndQuest(db, campaign.id)
    const assigned = setQuestFoeAssignment(db, quest.id, [
      { speciesId: speciesA.id, plannedComposition: SAMPLE_COMPOSITION },
      { speciesId: speciesB.id }
    ])
    expect(assigned).toHaveLength(2)
    expect(assigned[0]).toMatchObject({
      questId: quest.id,
      speciesId: speciesA.id,
      plannedComposition: SAMPLE_COMPOSITION,
      sortOrder: 0
    })
    expect(assigned[1]).toMatchObject({
      questId: quest.id,
      speciesId: speciesB.id,
      plannedComposition: null,
      sortOrder: 1
    })
    expect(listQuestFoeAssignments(db, quest.id)).toEqual(assigned)
    const replaced = setQuestFoeAssignment(db, quest.id, [{ speciesId: speciesB.id }])
    expect(replaced).toHaveLength(1)
    expect(replaced[0]?.speciesId).toBe(speciesB.id)
    expect(listQuestFoeAssignments(db, quest.id)).toHaveLength(1)
  })
})

describe('bestiary cascade delete', () => {
  it('cascade: deleteCampaignCascade removes species, variants, and quest foe assignments', () => {
    const db = createTestDb()
    const { campaign } = seedCampaign(db)
    const species = createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'wolf',
      name: 'Wolf',
      baseLore: 'Pack hunters of the woods.',
      buckets: ['beast'],
      tags: ['pack'],
      variants: [{ variantKey: 'standard' }, { variantKey: 'alpha' }]
    })
    const quest = createQuest(db, {
      campaignId: campaign.id,
      kind: 'side',
      title: 'Wolf hunt',
      summary: 'Thin the pack.',
      scale: 'minor'
    })
    setQuestFoeAssignment(db, quest.id, [
      { speciesId: species.id, plannedComposition: SAMPLE_COMPOSITION }
    ])
    expect(listBestiarySpecies(db, campaign.id)).toHaveLength(1)
    expect(listBestiaryVariants(db, species.id)).toHaveLength(2)
    expect(listQuestFoeAssignments(db, quest.id)).toHaveLength(1)
    deleteCampaignCascade(db, campaign.id)
    expect(
      (db.prepare('SELECT COUNT(*) as count FROM bestiary_species WHERE campaign_id = ?').get(campaign.id) as {
        count: number
      }).count
    ).toBe(0)
    expect(
      (db.prepare('SELECT COUNT(*) as count FROM bestiary_variants WHERE species_id = ?').get(species.id) as {
        count: number
      }).count
    ).toBe(0)
    expect(
      (db.prepare('SELECT COUNT(*) as count FROM quest_foe_assignments WHERE quest_id = ?').get(quest.id) as {
        count: number
      }).count
    ).toBe(0)
  })
})

describe('NPC bestiary link', () => {
  it('NPC can store bestiary_species_id + variant_key on create and update', () => {
    const db = createTestDb()
    const { campaign, region } = seedCampaign(db)
    const species = createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'rift-beast',
      name: 'Rift-beast',
      baseLore: 'Lore.',
      buckets: ['beast'],
      tags: []
    })
    const created = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Scarred Rift-beast',
      role: 'hostile',
      disposition: 'hostile',
      bestiarySpeciesId: species.id,
      bestiaryVariantKey: 'alpha'
    })
    expect(created.bestiarySpeciesId).toBe(species.id)
    expect(created.bestiaryVariantKey).toBe('alpha')
    expect(getNpcById(db, created.id)?.bestiarySpeciesId).toBe(species.id)
    expect(getNpcById(db, created.id)?.bestiaryVariantKey).toBe('alpha')
    setNpcBestiaryLink(db, created.id, {
      bestiarySpeciesId: species.id,
      bestiaryVariantKey: 'standard'
    })
    expect(getNpcById(db, created.id)?.bestiaryVariantKey).toBe('standard')
    setNpcBestiaryLink(db, created.id, {
      bestiarySpeciesId: null,
      bestiaryVariantKey: null
    })
    expect(getNpcById(db, created.id)?.bestiarySpeciesId).toBeNull()
    expect(getNpcById(db, created.id)?.bestiaryVariantKey).toBeNull()
  })
})
