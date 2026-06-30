import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createRegion } from './regions'
import { createNpc, getNpcById, setNpcCombatStats } from './npcs'
import { hydrateNpcFromCatalog, hydrateNpcWithFallback } from './npcCombatHydration'
import { getCreatureByKey } from '../catalog/creatures'

function seedCampaignRegion() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'T', premisePrompt: 'T', deathMode: 'legendary' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'R' })
  return { db, campaign, region }
}

describe('npc combat hydration from catalog', () => {
  it('hydrates from catalog creature', () => {
    const { db, campaign, region } = seedCampaignRegion()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Scout',
      role: 'enemy',
      disposition: 'hostile',
      skipCombatHydration: true
    })
    const creature = getCreatureByKey(db, 'goblin-scout')
    expect(creature).toBeDefined()
    hydrateNpcFromCatalog(db, npc.id, creature!)
    const hydrated = getNpcById(db, npc.id)
    expect(hydrated?.hp).toBe(creature!.hp)
    expect(hydrated?.catalogCreatureKey).toBe('goblin-scout')
  })

  it('skips hydration when stats already set', () => {
    const { db, campaign, region } = seedCampaignRegion()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Boss',
      role: 'enemy',
      disposition: 'hostile',
      skipCombatHydration: true
    })
    setNpcCombatStats(db, npc.id, { hp: 3, maxHp: 10, ac: 14 })
    const creature = getCreatureByKey(db, 'goblin-scout')
    hydrateNpcFromCatalog(db, npc.id, creature!)
    expect(getNpcById(db, npc.id)?.hp).toBe(3)
  })
})

describe('npc combat villager fallback', () => {
  it('uses villager fallback when no catalog', () => {
    const { db, campaign, region } = seedCampaignRegion()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Farmer',
      role: 'villager',
      disposition: 'neutral'
    })
    hydrateNpcWithFallback(db, npc.id)
    expect(getNpcById(db, npc.id)?.hp).toBe(6)
  })
})
