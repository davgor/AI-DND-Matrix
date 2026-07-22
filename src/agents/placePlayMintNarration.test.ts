import type Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion, listRegionsByCampaign } from '../db/repositories/regions'
import { assembleNarrationContext, narrate, persistNarrationSideEffects } from './dm'
import {
  persistPlacePlayMintSideEffects,
  resolvePlaceParentRegionId
} from './placePlayMintNarration'
import { MAX_PLACE_PROPOSALS_PER_TURN, type PlaceProposal } from '../shared/playPopulation'
import { createScriptedProvider } from './providers/mockHarness'
import type { CheckOutcome } from './dm'

const hamletProposal: PlaceProposal = {
  key: 'mistwood-hamlet',
  name: 'Mistwood Hamlet',
  description: 'A nameless cluster of cottages at the forest edge.'
}

function seedScene(db: Database.Database) {
  const campaign = createCampaign(db, {
    name: 'Roads',
    premisePrompt: 'Travel and discovery',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Old Road',
    description: 'A muddy trade path'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Brynn',
    characterClass: 'ranger',
    kind: 'player'
  })
  return { campaign, region, hero }
}

describe('persistPlacePlayMintSideEffects mint dedupe', () => {
  it('persists a region and skips duplicates by name and key', () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)

    persistPlacePlayMintSideEffects(
      db,
      { placeProposals: [hamletProposal] },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )

    const afterFirst = listRegionsByCampaign(db, campaign.id)
    expect(afterFirst.map((r) => r.name).sort()).toEqual(['Mistwood Hamlet', 'Old Road'])

    persistPlacePlayMintSideEffects(
      db,
      {
        placeProposals: [
          { ...hamletProposal, description: 'noop rename attempt' },
          { key: 'other-key', name: 'mistwood hamlet', description: 'case dupe' }
        ]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )

    expect(listRegionsByCampaign(db, campaign.id)).toHaveLength(2)
    expect(
      listRegionsByCampaign(db, campaign.id).find((r) => r.name === 'Mistwood Hamlet')?.description
    ).toBe('A nameless cluster of cottages at the forest edge.')
  })
})

describe('persistPlacePlayMintSideEffects mint clamp', () => {
  it(`clamps to ${MAX_PLACE_PROPOSALS_PER_TURN} mints per turn`, () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)

    persistPlacePlayMintSideEffects(
      db,
      {
        placeProposals: [
          hamletProposal,
          { key: 'ford-camp', name: 'Ford Camp', description: 'Tents by the crossing.' },
          { key: 'ridge-watch', name: 'Ridge Watch', description: 'A lonely lookout.' }
        ]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )

    expect(listRegionsByCampaign(db, campaign.id)).toHaveLength(1 + MAX_PLACE_PROPOSALS_PER_TURN)
  })
})

describe('parent region FK: unknown parent', () => {
  it('ignores unknown parent FK and still mints against the campaign', () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)
    const withMissing = {
      ...hamletProposal,
      parentRegionId: 'missing-parent',
      parentRegionKey: 'also-missing'
    }
    expect(resolvePlaceParentRegionId(db, campaign.id, withMissing, region.id)).toBe(region.id)
    persistPlacePlayMintSideEffects(
      db,
      { placeProposals: [withMissing] },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )
    const minted = listRegionsByCampaign(db, campaign.id).find((r) => r.name === 'Mistwood Hamlet')
    expect(minted).toBeDefined()
    expect(minted?.campaignId).toBe(campaign.id)
  })
})

describe('parent region FK: valid parent id', () => {
  it('accepts a valid parent region id without throwing', () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)
    const withParent = { ...hamletProposal, parentRegionId: region.id }
    expect(resolvePlaceParentRegionId(db, campaign.id, withParent, region.id)).toBe(region.id)
    persistPlacePlayMintSideEffects(
      db,
      { placeProposals: [withParent] },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )
    expect(listRegionsByCampaign(db, campaign.id).map((r) => r.name).sort()).toEqual([
      'Mistwood Hamlet',
      'Old Road'
    ])
  })
})

describe('parent region FK: parentRegionKey', () => {
  it('resolves parentRegionKey by slugified region name', () => {
    const db = createTestDb()
    const { campaign, region } = seedScene(db)
    expect(
      resolvePlaceParentRegionId(
        db,
        campaign.id,
        { ...hamletProposal, parentRegionKey: 'Old Road' },
        'unused-fallback'
      )
    ).toBe(region.id)
  })
})

describe('narrate placeProposals parse (141)', () => {
  it('parses typed placeProposals from stub provider JSON', async () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)
    const outcome: CheckOutcome = { success: true, total: 12, dc: 10 }
    const context = await assembleNarrationContext({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      characterId: hero.id,
      playerInput: 'I follow a side path into an unnamed hamlet'
    })
    const provider = createScriptedProvider([
      JSON.stringify({
        narrationText: 'Cottages appear through the mist.',
        placeProposals: [hamletProposal]
      })
    ])

    const result = await narrate(provider, outcome, context)
    expect(result.placeProposals).toEqual([hamletProposal])

    await persistNarrationSideEffects(db, result, {
      campaignId: campaign.id,
      regionId: region.id,
      characterId: hero.id
    })
    expect(listRegionsByCampaign(db, campaign.id).map((r) => r.name).sort()).toEqual([
      'Mistwood Hamlet',
      'Old Road'
    ])
  })
})

describe('persistNarrationSideEffects placeProposals integration', () => {
  it('persists mint through the narration side-effect pipeline', async () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)

    await persistNarrationSideEffects(
      db,
      { narrationText: 'A hamlet emerges.', placeProposals: [hamletProposal] },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )

    expect(listRegionsByCampaign(db, campaign.id).map((r) => r.name).sort()).toEqual([
      'Mistwood Hamlet',
      'Old Road'
    ])
  })
})
