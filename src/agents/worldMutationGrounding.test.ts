import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createNpc, updateNpcStatus } from '../db/repositories/npcs'
import { createRegion, updateRegionStatus } from '../db/repositories/regions'
import { WORLD_MUTATION_DIGEST_MAX_CHARS } from '../shared/worldMutations'
import { assembleNarrationContext } from './dm'

function seedDestroyedAshlands(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Ash',
    premisePrompt: 'Ruin',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'Farming village'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player'
  })
  const mira = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'miller',
    disposition: 'friendly'
  })
  updateRegionStatus(db, region.id, { destroyed: true, cause: 'dragonfire' })
  return { campaign, region, hero, mira }
}

describe('world mutation grounding (130.3)', () => {
  it('includes destroyed region digest and alive flags in narration context', async () => {
    const db = createTestDb()
    const { campaign, region, hero, mira } = seedDestroyedAshlands(db)
    updateNpcStatus(db, mira.id, { alive: false })

    const context = await assembleNarrationContext({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      characterId: hero.id,
      playerInput: 'I look around'
    })

    expect(context.regionStatus).toEqual({ destroyed: true, cause: 'dragonfire' })
    expect(context.worldMutationDigest).toBeDefined()
    expect(context.worldMutationDigest!).toContain('DESTROYED')
    expect(context.worldMutationDigest!.length).toBeLessThanOrEqual(WORLD_MUTATION_DIGEST_MAX_CHARS)
    expect(context.presentNpcs.find((npc) => npc.id === mira.id)?.alive).toBe(false)
  })

  it('includes regional destroy digest in NPC context when the place is destroyed', async () => {
    const db = createTestDb()
    const { mira } = seedDestroyedAshlands(db)

    const { assembleNpcContext } = await import('./npc')
    const npcContext = await assembleNpcContext(db, mira)
    expect(npcContext.worldMutationDigest).toBeDefined()
    expect(npcContext.worldMutationDigest!).toContain('DESTROYED')
  })
})
