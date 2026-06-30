import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createNpc, getNpcById } from '../db/repositories/npcs'
import { createScriptedProvider } from './providers/mockHarness'
import { buildReviewPrompt, reviewRetiredAdventurer } from './retiredAdventurerReview'

function seedSpeakingNpc(backstory: string) {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Test',
    premisePrompt: 'A village',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A village'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Tom',
    role: 'baker',
    disposition: 'friendly',
    alignment: 'neutral_good',
    backstory,
    skipCombatHydration: true
  })
  return { db, npc }
}

describe('reviewRetiredAdventurer', () => {
  it('defaults mundane backstory to upgrade false', async () => {
    const { db, npc } = seedSpeakingNpc('Tom has baked bread in Oakhollow for thirty years.')
    const provider = createScriptedProvider(['not json', '{"upgrade":false}'])
    const result = await reviewRetiredAdventurer(provider, getNpcById(db, npc.id) as typeof npc)
    expect(result).toEqual({ upgrade: false })
  })

  it('can upgrade retired guard captain backstory', async () => {
    const { db, npc } = seedSpeakingNpc(
      'Captain Mara led the town guard for twenty years before retiring to advise the mayor.'
    )
    const provider = createScriptedProvider(['{"upgrade":true,"profile":"veteran"}'])
    const result = await reviewRetiredAdventurer(provider, getNpcById(db, npc.id) as typeof npc)
    expect(result).toEqual({ upgrade: true, profile: 'veteran' })
  })

  it('prompt forbids inventing new history', () => {
    const npc = {
      name: 'Edda',
      role: 'farmer',
      alignment: 'true_neutral' as const,
      disposition: 'wary',
      temperament: 'cautious' as const,
      backstory: 'Edda tends sheep on the moor.'
    }
    const prompt = buildReviewPrompt(npc as Parameters<typeof buildReviewPrompt>[0])
    expect(prompt).toContain('do not invent')
    expect(prompt).toContain('Persisted backstory')
    expect(prompt).not.toContain('invent a new past')
  })
})
