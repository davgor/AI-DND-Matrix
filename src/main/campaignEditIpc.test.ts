import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { NPC_SPEAKING_STYLE_RESPONSE, persistNpcEnrichmentResponses, RACE_LORE_RESPONSE, additionalRegionLabeledBlocks } from '../test/fixtures/campaignGenerationFixtures'
import { editNpcDisposition, editNpcTraits, editRegionDescription, editWorldHistory, editPantheonSummary, editFactionsSummary, editGenerativeTokens, editNpcFaceTokenGeneration, editEnemyTokenGeneration, deleteNpcForCampaign, deleteRegionForCampaign, generateNpcForCampaign, generateRegionForCampaign, generateBestiarySpeciesForCampaign } from './campaignEditIpc'

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

const ADDITIONAL_REGION = additionalRegionLabeledBlocks(
  makeRegion('Mistfen Crossing'),
  makeNpcs('Mistfen Crossing', 'Mist')
)

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

describe('editGenerativeTokens', () => {
  it('persists the unified generative-tokens toggle and returns refreshed detail', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Test Campaign',
      premisePrompt: 'A flooded kingdom.',
      deathMode: 'legendary'
    })
    expect(campaign.generativeTokensEnabled).toBe(false)

    const detail = editGenerativeTokens(db, {
      campaignId: campaign.id,
      enabled: true
    })

    expect(detail.campaign?.generativeTokensEnabled).toBe(true)
    expect(detail.campaign?.npcFaceTokenGenerationEnabled).toBe(true)
    expect(detail.campaign?.enemyTokenGenerationEnabled).toBe(true)
  })
})

describe('editNpcFaceTokenGeneration', () => {
  it('persists the face-token toggle and returns refreshed detail', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Test Campaign',
      premisePrompt: 'A flooded kingdom.',
      deathMode: 'legendary'
    })
    expect(campaign.npcFaceTokenGenerationEnabled).toBe(false)

    const detail = editNpcFaceTokenGeneration(db, {
      campaignId: campaign.id,
      enabled: true
    })

    expect(detail.campaign?.npcFaceTokenGenerationEnabled).toBe(true)
  })
})

describe('editEnemyTokenGeneration', () => {
  it('persists the enemy-token toggle and returns refreshed detail', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Test Campaign',
      premisePrompt: 'A flooded kingdom.',
      deathMode: 'legendary'
    })
    expect(campaign.enemyTokenGenerationEnabled).toBe(false)

    const detail = editEnemyTokenGeneration(db, {
      campaignId: campaign.id,
      enabled: true
    })

    expect(detail.campaign?.enemyTokenGenerationEnabled).toBe(true)
  })
})

describe('editPantheonSummary', () => {
  it('persists pantheon summary and returns refreshed detail', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Test Campaign',
      premisePrompt: 'A flooded kingdom.',
      deathMode: 'legendary',
      pantheonSummary: 'Old faith.'
    })

    const detail = editPantheonSummary(db, {
      campaignId: campaign.id,
      pantheonSummary: 'Gods of tide and ash still argue over drowned crowns.'
    })

    expect(detail.campaign?.pantheonSummary).toContain('tide and ash')
  })
})

describe('editFactionsSummary', () => {
  it('persists factions summary and returns factions on detail', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Test Campaign',
      premisePrompt: 'A flooded kingdom.',
      deathMode: 'legendary',
      factionsSummary: 'Old intrigue.'
    })

    const detail = editFactionsSummary(db, {
      campaignId: campaign.id,
      factionsSummary: 'Harbor courts and tide temples trade favors after every storm.'
    })

    expect(detail.campaign?.factionsSummary).toContain('Harbor courts')
    expect(detail.factions).toEqual([])
    expect(detail.factionRelations).toEqual([])
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
          'River towns still pay twin tolls to guild barges and temple courts. Ferry crews know which captains smuggle refugees after harvest failures.\n\nMercenary companies winter in the hill forts they once besieged, selling escorts to caravans that cannot trust the high roads. Every contract names a different villain, but the same muddy passes.\n\nStorm priests claim the barrow lights are warnings, not invitations. Locals hire outsiders anyway because the granaries are half empty.'
      })
    ])
    const updatedHistory =
      'Edited epoch one.\n\nEdited epoch two.\n\nEdited epoch three.\n\nEdited epoch four.\n\nEdited epoch five.'

    const detail = await editWorldHistory(db, provider, {
      campaignId: campaign.id,
      worldHistory: updatedHistory
    })

    expect(detail.campaign?.worldHistory).toBe(updatedHistory)
    expect(detail.campaign?.worldSummary).toContain('River towns')
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
    const provider = createScriptedProvider([ADDITIONAL_REGION, ...persistNpcEnrichmentResponses(3)])

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
    const emptyRegion = additionalRegionLabeledBlocks(makeRegion('Silent Moor'), [])
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
    const provider = createScriptedProvider([
      coreBundle,
      RACE_LORE_RESPONSE,
      finalNpc,
      NPC_SPEAKING_STYLE_RESPONSE,
      '{"upgrade":false}'
    ])

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

describe('generateBestiarySpeciesForCampaign', () => {
  const loreResponse = JSON.stringify({
    baseLore:
      'Coral Titans ambush coastal roads at low tide, hauling wagons under reef shells. Fishers mark the tide by their clicking claws.',
    visualAppearance: {
      silhouette: 'massive crab',
      sizeClass: 'huge',
      primaryColors: ['coral', 'teal'],
      distinguishingMarks: 'wagon-sized reef shell',
      textureOrMaterial: 'barnacle-crusted chitin'
    }
  })

  it('creates a campaign-specific species from a user prompt', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Tide Campaign',
      premisePrompt: 'Coastal roads and reef monsters.',
      deathMode: 'standard'
    })
    const provider = createScriptedProvider([loreResponse])
    const detail = await generateBestiarySpeciesForCampaign(db, provider, {
      campaignId: campaign.id,
      seedPrompt: 'Coral Titan\nA wagon-sized reef crab that ambushes coastal roads.'
    })
    const custom = detail.bestiary.filter((entry) => entry.origin === 'campaign')
    expect(custom.some((entry) => entry.species.name === 'Coral Titan')).toBe(true)
    expect(custom.some((entry) => entry.species.tags.includes('user-prompt'))).toBe(true)
  })

  it('rejects an empty seed prompt', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Tide Campaign',
      premisePrompt: 'Coastal roads.',
      deathMode: 'standard'
    })
    await expect(
      generateBestiarySpeciesForCampaign(db, createScriptedProvider([]), {
        campaignId: campaign.id,
        seedPrompt: '  '
      })
    ).rejects.toThrow(/seed/i)
  })
})
