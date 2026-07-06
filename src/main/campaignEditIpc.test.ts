import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { npcReviewResponses, RACE_LORE_RESPONSE } from '../agents/campaignGeneration/fixtures'
import { editNpcDisposition, editNpcTraits, editRegionDescription, editWorldHistory, deleteNpcForCampaign, deleteRegionForCampaign, generateNpcForCampaign, generateRegionForCampaign, setCampaignDeathMode } from './campaignEditIpc'

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
      alignment: 'true_neutral',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    },
    {
      name: `${prefix} Two`,
      role: 'merchant',
      backstory: `${prefix} Two runs a stall in ${regionName}.`,
      disposition: 'curious',
      regionName,
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
    },
    {
      name: `${prefix} Three`,
      role: 'guard',
      backstory: `${prefix} Three keeps watch near ${regionName}.`,
      disposition: 'wary',
      regionName,
      temperament: 'disciplined',
      canSpeak: true,
      alignment: 'lawful_neutral',
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner'
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
      race: 'human',
      background: 'folk_hero',
      gender: 'unspecified',
      class: 'commoner',
      canSpeak: false
    })

    const updated = detail.npcs.find((n) => n.id === npc.id)
    expect(updated?.disposition).toBe('guarded but fair')
    expect(updated?.temperament).toBe('cautious')
    expect(updated?.alignment).toBe('lawful_neutral')
    expect(updated?.canSpeak).toBe(false)
  })
})

describe('editWorldHistory', () => {
  it('persists history and regenerates the world summary from the agent', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Test Campaign',
      premisePrompt: 'A flooded kingdom.',
      deathMode: 'legendary',
      worldName: 'Tyria',
      worldSummary: 'Old hook one.\n\nOld hook two.\n\nOld hook three.',
      worldHistory: 'Epoch one.\n\nEpoch two.\n\nEpoch three.\n\nEpoch four.\n\nEpoch five.'
    })
    const provider = createScriptedProvider([
      JSON.stringify({
        worldSummary:
          'Fresh hook one.\n\nFresh hook two.\n\nFresh hook three.'
      })
    ])
    const updatedHistory =
      'Edited epoch one.\n\nEdited epoch two.\n\nEdited epoch three.\n\nEdited epoch four.\n\nEdited epoch five.'

    const detail = await editWorldHistory(db, provider, {
      campaignId: campaign.id,
      worldHistory: updatedHistory
    })

    expect(detail.campaign?.worldHistory).toBe(updatedHistory)
    expect(detail.campaign?.worldSummary).toContain('Fresh hook one')
  })
})

describe('deleteRegionForCampaign', () => {
  it('removes the region and returns refreshed detail', () => {
    const { db, campaign, region } = seedCampaignWithRegionAndNpc()

    const detail = deleteRegionForCampaign(db, {
      campaignId: campaign.id,
      regionId: region.id
    })

    expect(detail.regions).toHaveLength(0)
    expect(detail.npcs).toHaveLength(0)
  })

  it('rejects a region outside the campaign', () => {
    const { db, region } = seedCampaignWithRegionAndNpc()
    const other = createCampaign(db, {
      name: 'Other',
      premisePrompt: 'Other premise.',
      deathMode: 'legendary'
    })

    expect(() =>
      deleteRegionForCampaign(db, {
        campaignId: other.id,
        regionId: region.id
      })
    ).toThrow(/not found/i)
  })
})

describe('generateRegionForCampaign', () => {
  it('adds a generated region with extras and three NPCs by default', async () => {
    const { db, campaign } = seedCampaignWithRegionAndNpc()
    const provider = createScriptedProvider([ADDITIONAL_REGION, RACE_LORE_RESPONSE, ...npcReviewResponses(3)])

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

  it('honors a custom npcCount including zero', async () => {
    const { db, campaign } = seedCampaignWithRegionAndNpc()
    const emptyRegion = JSON.stringify({
      region: makeRegion('Silent Moor'),
      npcs: []
    })
    const provider = createScriptedProvider([emptyRegion])

    const detail = await generateRegionForCampaign(db, provider, {
      campaignId: campaign.id,
      seedPrompt: 'A quiet moor',
      npcCount: 0
    })

    const moor = detail.regions.find((region) => region.name === 'Silent Moor')
    expect(moor).toBeDefined()
    expect(detail.npcs.filter((npc) => npc.regionId === moor!.id)).toHaveLength(0)
  })
})

describe('deleteNpcForCampaign', () => {
  it('removes the NPC and returns refreshed detail', () => {
    const { db, campaign, npc } = seedCampaignWithRegionAndNpc()

    const detail = deleteNpcForCampaign(db, {
      campaignId: campaign.id,
      npcId: npc.id
    })

    expect(detail.npcs).toHaveLength(0)
  })

  it('rejects an NPC outside the campaign', () => {
    const { db, npc } = seedCampaignWithRegionAndNpc()
    const other = createCampaign(db, {
      name: 'Other',
      premisePrompt: 'Other premise.',
      deathMode: 'legendary'
    })

    expect(() =>
      deleteNpcForCampaign(db, {
        campaignId: other.id,
        npcId: npc.id
      })
    ).toThrow(/not found/i)
  })
})

describe('generateNpcForCampaign', () => {
  it('appends one NPC to the target region', async () => {
    const { db, campaign, region } = seedCampaignWithRegionAndNpc()
    const coreBundle = JSON.stringify({
      canSpeak: true,
      temperament: 'cautious',
      race: 'human',
      gender: 'unspecified',
      alignment: 'true_neutral',
      class: 'commoner',
      background: 'hermit'
    })
    const finalNpc = JSON.stringify({
      name: 'Rook Vale',
      role: 'hermit',
      backstory: 'Rook keeps to the fog.',
      disposition: 'gruff'
    })
    const provider = createScriptedProvider([coreBundle, RACE_LORE_RESPONSE, finalNpc, '{"upgrade":false}'])

    const detail = await generateNpcForCampaign(db, provider, {
      campaignId: campaign.id,
      regionId: region.id,
      seedPrompt: 'A hermit in the woods'
    })

    expect(detail.npcs.filter((npc) => npc.regionId === region.id)).toHaveLength(2)
    expect(detail.npcs.some((npc) => npc.name === 'Rook Vale')).toBe(true)
  })

  it('rejects an empty seed prompt', async () => {
    const { db, campaign, region } = seedCampaignWithRegionAndNpc()
    await expect(
      generateNpcForCampaign(db, createScriptedProvider([]), {
        campaignId: campaign.id,
        regionId: region.id,
        seedPrompt: '   '
      })
    ).rejects.toThrow(/seed/i)
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
