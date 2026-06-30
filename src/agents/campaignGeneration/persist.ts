import type Database from 'better-sqlite3'
import { createCampaign, type Campaign } from '../../db/repositories/campaigns'
import { createNpcWithCombatReview } from '../../db/repositories/npcCombatHydration'
import { createRegion } from '../../db/repositories/regions'
import { createRegionHistoryEntry } from '../../db/repositories/regionHistory'
import { createStoryThread } from '../../db/repositories/storyThreads'
import { createWorldFact } from '../../db/repositories/worldFacts'
import type { Provider } from '../providers/types'
import type {
  CampaignGenerationResult,
  CampaignSetupInput,
  GeneratedNpc,
  GeneratedRegion,
  PersistRegionWithNpcsInput
} from './types'
import { CampaignGenerationSchemaError } from './types'

export async function persistRegionWithNpcs(input: PersistRegionWithNpcsInput): Promise<void> {
  const { db, provider, campaignId, generatedRegion, generatedNpcs } = input
  const region = createRegion(db, {
    campaignId,
    name: generatedRegion.name,
    description: generatedRegion.description
  })

  createRegionHistoryEntry(db, {
    regionId: region.id,
    inGameDate: 0,
    content: generatedRegion.historyBackstory
  })
  createRegionHistoryEntry(db, {
    regionId: region.id,
    inGameDate: 1,
    content: generatedRegion.recentHistory
  })

  for (const quest of generatedRegion.potentialQuests) {
    createWorldFact(db, {
      campaignId,
      regionId: region.id,
      factionTag: 'quest_hook',
      content: quest
    })
  }

  for (const generatedNpc of generatedNpcs) {
    if (generatedNpc.regionName !== generatedRegion.name) {
      throw new CampaignGenerationSchemaError(
        `Generated NPC "${generatedNpc.name}" references wrong region "${generatedNpc.regionName}"`
      )
    }
    await createNpcWithCombatReview(db, provider, {
      campaignId,
      regionId: region.id,
      name: generatedNpc.name,
      role: generatedNpc.role,
      disposition: generatedNpc.disposition,
      alignment: generatedNpc.alignment ?? null,
      temperament: generatedNpc.temperament,
      canSpeak: generatedNpc.canSpeak,
      backstory: generatedNpc.backstory ?? ''
    })
  }
}

function persistGeneratedRegionsWithQuests(
  db: Database.Database,
  campaignId: string,
  regions: GeneratedRegion[]
): Map<string, string> {
  const regionIdsByName = new Map<string, string>()
  for (const generatedRegion of regions) {
    const region = createRegion(db, {
      campaignId,
      name: generatedRegion.name,
      description: generatedRegion.description
    })
    regionIdsByName.set(generatedRegion.name, region.id)
    createRegionHistoryEntry(db, {
      regionId: region.id,
      inGameDate: 0,
      content: generatedRegion.historyBackstory
    })
    createRegionHistoryEntry(db, {
      regionId: region.id,
      inGameDate: 1,
      content: generatedRegion.recentHistory
    })
    for (const quest of generatedRegion.potentialQuests) {
      createWorldFact(db, {
        campaignId,
        regionId: region.id,
        factionTag: 'quest_hook',
        content: quest
      })
    }
  }
  return regionIdsByName
}

interface PersistCampaignNpcsInput {
  db: Database.Database
  provider: Provider
  campaignId: string
  npcs: GeneratedNpc[]
  regionIdsByName: Map<string, string>
}

async function persistCampaignNpcsFromGeneration(input: PersistCampaignNpcsInput): Promise<void> {
  const { db, provider, campaignId, npcs, regionIdsByName } = input
  for (const generatedNpc of npcs) {
    const regionId = regionIdsByName.get(generatedNpc.regionName)
    if (!regionId) {
      throw new CampaignGenerationSchemaError(
        `Generated NPC "${generatedNpc.name}" references unknown region "${generatedNpc.regionName}"`
      )
    }
    await createNpcWithCombatReview(db, provider, {
      campaignId,
      regionId,
      name: generatedNpc.name,
      role: generatedNpc.role,
      disposition: generatedNpc.disposition,
      alignment: generatedNpc.alignment ?? null,
      temperament: generatedNpc.temperament,
      canSpeak: generatedNpc.canSpeak,
      backstory: generatedNpc.backstory ?? ''
    })
  }
}

export async function persistGeneratedCampaign(
  db: Database.Database,
  provider: Provider,
  input: CampaignSetupInput,
  generation: CampaignGenerationResult
): Promise<Campaign> {
  const campaign = createCampaign(db, {
    name: input.name,
    premisePrompt: input.premisePrompt,
    deathMode: input.deathMode,
    respawnRules: input.respawnRules ?? null
  })

  const regionIdsByName = persistGeneratedRegionsWithQuests(db, campaign.id, generation.regions)
  await persistCampaignNpcsFromGeneration({
    db,
    provider,
    campaignId: campaign.id,
    npcs: generation.npcs,
    regionIdsByName
  })

  createStoryThread(db, {
    campaignId: campaign.id,
    title: generation.storyThread.title,
    state: generation.storyThread.state,
    summary: generation.storyThread.summary
  })

  return campaign
}
