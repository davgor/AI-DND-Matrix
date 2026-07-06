import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { listNpcsByRegion } from './repositories/npcs'
import { listRegionsByCampaign } from './repositories/regions'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { buildCascadingSeedResponses, npcReviewResponses, RACE_LORE_RESPONSE } from '../agents/campaignGeneration/fixtures'
import { generateAndPersistCampaign } from '../agents/campaignGeneration'

describe('npc background bulk persistence (051.7)', () => {
  it('persists backgroundKey for bulk-generated speaking NPCs', async () => {
    const db = createTestDb()
    const provider = createScriptedProvider([
      ...buildCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 3 }),
      RACE_LORE_RESPONSE,
      ...npcReviewResponses(6)
    ])
    const campaign = await generateAndPersistCampaign(db, provider, {
      name: 'Background Test',
      premisePrompt: 'A flooded kingdom.',
      deathMode: 'legendary'
    })

    const speakingNpcs = listRegionsByCampaign(db, campaign.id).flatMap((region) =>
      listNpcsByRegion(db, region.id).filter((npc) => npc.canSpeak)
    )
    expect(speakingNpcs.length).toBeGreaterThan(0)
    expect(speakingNpcs.every((npc) => npc.backgroundKey !== null)).toBe(true)
    expect(speakingNpcs.every((npc) => npc.genderKey !== null)).toBe(true)
    expect(speakingNpcs.every((npc) => npc.classKey !== null)).toBe(true)
  })
})
