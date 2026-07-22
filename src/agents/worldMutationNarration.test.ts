import type Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createNpc, getNpcById } from '../db/repositories/npcs'
import { createRegion, getRegionById } from '../db/repositories/regions'
import { listWorldFactsByRegionOrFaction } from '../db/repositories/worldFacts'
import { persistNarrationSideEffects } from './dm'
import { persistWorldMutationSideEffects } from './worldMutationNarration'

function seedScene(db: Database.Database) {
  const campaign = createCampaign(db, {
    name: 'Ashlands',
    premisePrompt: 'Burned villages',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A quiet farming village.'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'miller',
    disposition: 'friendly'
  })
  return { campaign, region, hero, npc }
}

describe('persistWorldMutationSideEffects region', () => {
  it('marks region destroyed with cause and survives re-read', () => {
    const db = createTestDb()
    const { campaign, region } = seedScene(db)
    persistWorldMutationSideEffects(
      db,
      {
        narrationText: 'Flames consume the thatch.',
        regionStatusUpdates: [{ regionId: region.id, op: 'destroy', cause: 'arson' }]
      },
      { campaignId: campaign.id, regionId: region.id }
    )
    const after = getRegionById(db, region.id)!
    expect(after.status).toEqual({ destroyed: true, damaged: false, cause: 'arson' })
  })

  it('ignores invalid region ids without corrupting other regions', () => {
    const db = createTestDb()
    const { campaign, region } = seedScene(db)
    persistWorldMutationSideEffects(
      db,
      {
        narrationText: 'Chaos.',
        regionStatusUpdates: [
          { regionId: 'missing-region', op: 'destroy', cause: 'void' },
          { regionId: region.id, op: 'damage', cause: 'catapult' }
        ]
      },
      { campaignId: campaign.id, regionId: region.id }
    )
    expect(getRegionById(db, region.id)?.status).toEqual({
      destroyed: false,
      damaged: true,
      cause: 'catapult'
    })
  })
})

describe('persistWorldMutationSideEffects npc life', () => {
  it('applies npc life updates and ignores foreign npc ids', () => {
    const db = createTestDb()
    const { campaign, region, npc } = seedScene(db)
    persistWorldMutationSideEffects(
      db,
      {
        narrationText: 'Mira falls.',
        npcLifeUpdates: [
          { npcId: npc.id, alive: false, cause: 'blade' },
          { npcId: 'ghost-id', alive: false }
        ]
      },
      { campaignId: campaign.id, regionId: region.id }
    )
    expect(getNpcById(db, npc.id)?.status.alive).toBe(false)
  })
})

describe('persistNarrationSideEffects world mutations (130.2)', () => {
  it('persists destroy + optional worldFact together via narration path', async () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)
    await persistNarrationSideEffects(
      db,
      {
        narrationText: 'The village burns.',
        worldFact: { content: 'Oakhollow was put to the torch.' },
        regionStatusUpdates: [{ regionId: region.id, op: 'destroy', cause: 'torch' }]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )
    expect(getRegionById(db, region.id)?.status.destroyed).toBe(true)
    const facts = listWorldFactsByRegionOrFaction(db, campaign.id, region.id)
    expect(facts.some((fact) => fact.content.includes('torch'))).toBe(true)
  })
})
