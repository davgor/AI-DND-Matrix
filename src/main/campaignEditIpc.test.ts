import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { npcReviewResponses } from '../agents/campaignGeneration.fixtures'
import { editNpcDisposition, editNpcTraits, editRegionDescription, generateRegionForCampaign, setCampaignDeathMode } from './campaignEditIpc'

function makeRegion(name: string) {
  return {
    name,
    description: `Description of ${name}.`,
    historyBackstory: `History of ${name}.`,
    recentHistory: `Recent events in ${name}.`,
    potentialQuests: [`Quest in ${name}`, `Another quest in ${name}`]
  }
}

function makeNpcs(regionName: string, prefix: string) {
  return [
    {
      name: `${prefix} One`,
      role: 'guide',
      backstory: `${prefix} One has lived in ${regionName} for years.`,
      disposition: 'friendly',
      regionName,
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: `${prefix} Two`,
      role: 'merchant',
      backstory: `${prefix} Two runs a stall in ${regionName}.`,
      disposition: 'curious',
      regionName,
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good'
    },
    {
      name: `${prefix} Three`,
      role: 'guard',
      backstory: `${prefix} Three keeps watch near ${regionName}.`,
      disposition: 'wary',
      regionName,
      temperament: 'disciplined',
      canSpeak: true,
      alignment: 'lawful_neutral'
    }
  ]
}

const ADDITIONAL_REGION = JSON.stringify({
  region: makeRegion('Mistfen Crossing'),
  npcs: makeNpcs('Mistfen Crossing', 'Mist')
})

function seedCampaignWithRegionAndNpc() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: 'A flooded kingdom.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A quiet logging village.'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'shopkeeper',
    disposition: 'friendly'
  })
  return { db, campaign, region, npc }
}

describe('editRegionDescription', () => {
  it('persists an edited region description and returns the refreshed detail', () => {
    const { db, campaign, region } = seedCampaignWithRegionAndNpc()

    const detail = editRegionDescription(db, {
      campaignId: campaign.id,
      regionId: region.id,
      description: 'Now a bustling trade hub.'
    })

    expect(detail.regions.find((r) => r.id === region.id)?.description).toBe(
      'Now a bustling trade hub.'
    )
  })
})

describe('editNpcDisposition', () => {
  it('persists an edited NPC disposition and returns the refreshed detail', () => {
    const { db, campaign, npc } = seedCampaignWithRegionAndNpc()

    const detail = editNpcDisposition(db, {
      campaignId: campaign.id,
      npcId: npc.id,
      disposition: 'wary, after the bandit raid'
    })

    expect(detail.npcs.find((n) => n.id === npc.id)?.disposition).toBe(
      'wary, after the bandit raid'
    )
  })
})

describe('editNpcTraits', () => {
  it('persists temperament, alignment, canSpeak, and disposition round-trips', () => {
    const { db, campaign, npc } = seedCampaignWithRegionAndNpc()

    const detail = editNpcTraits(db, {
      campaignId: campaign.id,
      npcId: npc.id,
      disposition: 'guarded but fair',
      temperament: 'cautious',
      alignment: 'lawful_neutral',
      canSpeak: false
    })

    const updated = detail.npcs.find((n) => n.id === npc.id)
    expect(updated?.disposition).toBe('guarded but fair')
    expect(updated?.temperament).toBe('cautious')
    expect(updated?.alignment).toBe('lawful_neutral')
    expect(updated?.canSpeak).toBe(false)
  })
})

describe('generateRegionForCampaign', () => {
  it('adds a generated region with extras and three NPCs', async () => {
    const { db, campaign } = seedCampaignWithRegionAndNpc()
    const provider = createScriptedProvider([ADDITIONAL_REGION, ...npcReviewResponses(3)])

    const detail = await generateRegionForCampaign(db, provider, {
      campaignId: campaign.id,
      seedPrompt: 'A marsh crossing shrouded in fog'
    })

    expect(detail.regions).toHaveLength(2)
    const mistfen = detail.regions.find((region) => region.name === 'Mistfen Crossing')
    expect(mistfen).toBeDefined()
    expect(detail.npcs.filter((npc) => npc.regionId === mistfen!.id)).toHaveLength(3)
    const extras = detail.regionExtras.find((entry) => entry.regionId === mistfen!.id)
    expect(extras?.recentHistory).toContain('Mistfen Crossing')
    expect(extras?.questHooks.length).toBeGreaterThanOrEqual(2)
  })
})

describe('setCampaignDeathMode', () => {
  it('switches the campaign to respawn mode with rules persisted', () => {
    const { db, campaign } = seedCampaignWithRegionAndNpc()

    const detail = setCampaignDeathMode(db, {
      campaignId: campaign.id,
      deathMode: 'respawn',
      respawnRules: { location: 'Last Shrine', cost: 50, limit: 3 }
    })

    expect(detail.campaign?.deathMode).toBe('respawn')
    expect(detail.campaign?.respawnRules).toEqual({ location: 'Last Shrine', cost: 50, limit: 3 })
  })
})
