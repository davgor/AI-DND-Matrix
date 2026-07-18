import type Database from 'better-sqlite3'
import { resolveOrRealizeCampaignRace } from '../raceLore'
import { createCampaign, type Campaign } from '../../db/repositories/campaigns'
import { createDeity } from '../../db/repositories/deities'
import { createNpcWithCombatReview } from '../../db/repositories/npcCombatHydration'
import { createRegion } from '../../db/repositories/regions'
import { createRegionHistoryEntry } from '../../db/repositories/regionHistory'
import { createStoryThread, listStoryThreadsByCampaign } from '../../db/repositories/storyThreads'
import {
  importSideQuestsFromQuestHooks,
  seedMainQuestForCampaign
} from '../../db/repositories/quests'
import { createWorldFact } from '../../db/repositories/worldFacts'
import type { Provider } from '../providers/types'
import type {
  CampaignGenerationResult,
  CampaignSetupInput,
  GeneratedNpc,
  GeneratedPantheon,
  GeneratedRegion,
  PersistRegionWithNpcsInput
} from './types'
import { CampaignGenerationSchemaError } from './types'
import { resolveGeneratedRegionName } from './normalize'

async function resolveNpcRaceIfSpeaking(
  db: Database.Database,
  provider: Provider,
  campaignId: string,
  generatedNpc: GeneratedNpc
): Promise<void> {
  if (generatedNpc.canSpeak && generatedNpc.raceKey) {
    await resolveOrRealizeCampaignRace(db, provider, {
      campaignId,
      raceKey: generatedNpc.raceKey
    })
  }
}

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
    await resolveNpcRaceIfSpeaking(db, provider, campaignId, generatedNpc)
    await createNpcWithCombatReview(db, provider, {
      campaignId,
      regionId: region.id,
      name: generatedNpc.name,
      role: generatedNpc.role,
      disposition: generatedNpc.disposition,
      alignment: generatedNpc.alignment ?? null,
      temperament: generatedNpc.temperament,
      canSpeak: generatedNpc.canSpeak,
      backstory: generatedNpc.backstory ?? '',
      raceKey: generatedNpc.raceKey ?? null,
      backgroundKey: generatedNpc.backgroundKey ?? null,
      genderKey: generatedNpc.genderKey ?? null,
      classKey: generatedNpc.classKey ?? null
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
  regionNames: string[]
}

async function persistCampaignNpcsFromGeneration(input: PersistCampaignNpcsInput): Promise<void> {
  const { db, provider, campaignId, npcs, regionIdsByName, regionNames } = input
  for (const generatedNpc of npcs) {
    const resolvedRegionName =
      resolveGeneratedRegionName(generatedNpc.regionName, regionNames) ?? generatedNpc.regionName
    const regionId = regionIdsByName.get(resolvedRegionName)
    if (!regionId) {
      throw new CampaignGenerationSchemaError(
        `Generated NPC "${generatedNpc.name}" references unknown region "${generatedNpc.regionName}"`
      )
    }
    await resolveNpcRaceIfSpeaking(db, provider, campaignId, generatedNpc)
    await createNpcWithCombatReview(db, provider, {
      campaignId,
      regionId,
      name: generatedNpc.name,
      role: generatedNpc.role,
      disposition: generatedNpc.disposition,
      alignment: generatedNpc.alignment ?? null,
      temperament: generatedNpc.temperament,
      canSpeak: generatedNpc.canSpeak,
      backstory: generatedNpc.backstory ?? '',
      raceKey: generatedNpc.raceKey ?? null,
      backgroundKey: generatedNpc.backgroundKey ?? null,
      genderKey: generatedNpc.genderKey ?? null,
      classKey: generatedNpc.classKey ?? null
    })
  }
}

function persistGeneratedPantheon(
  db: Database.Database,
  campaignId: string,
  pantheon: GeneratedPantheon
): void {
  for (const [index, deity] of pantheon.deities.entries()) {
    createDeity(db, {
      campaignId,
      name: deity.name,
      epithet: deity.epithet,
      domains: deity.domains,
      tenets: deity.tenets,
      blurb: deity.blurb,
      isForgotten: deity.isForgotten,
      sortOrder: index
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
    respawnRules: input.respawnRules ?? null,
    worldName: generation.world.worldName,
    worldSummary: generation.world.worldSummary,
    worldHistory: generation.world.worldHistory,
    pantheonSummary: generation.pantheon.pantheonSummary
  })

  persistGeneratedPantheon(db, campaign.id, generation.pantheon)

  const regionIdsByName = persistGeneratedRegionsWithQuests(db, campaign.id, generation.regions)
  await persistCampaignNpcsFromGeneration({
    db,
    provider,
    campaignId: campaign.id,
    npcs: generation.npcs,
    regionIdsByName,
    regionNames: generation.regions.map((region) => region.name)
  })

  createStoryThread(db, {
    campaignId: campaign.id,
    title: generation.storyThread.title,
    state: generation.storyThread.state,
    summary: generation.storyThread.summary
  })

  const [thread] = listStoryThreadsByCampaign(db, campaign.id)
  if (thread) {
    seedMainQuestForCampaign(db, {
      campaignId: campaign.id,
      storyThreadId: thread.id,
      title: thread.title,
      summary: thread.summary
    })
    importSideQuestsFromQuestHooks(db, campaign.id)
  }

  return campaign
}
