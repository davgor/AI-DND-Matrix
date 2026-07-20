import type Database from 'better-sqlite3'
import { resolveOrRealizeCampaignRace } from '../raceLore'
import { generateNpcSpeakingStyle } from '../npcSpeakingStyle'
import { generateOrGetBestiarySpecies } from '../bestiary/generateSpecies'
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
  GeneratedBestiaryRoster,
  GeneratedNpc,
  GeneratedPantheon,
  GeneratedRegion,
  PersistGeneratedCampaignOptions,
  PersistRegionWithNpcsInput
} from './types'
import { CampaignGenerationSchemaError } from './types'
import { resolveGeneratedRegionName } from './normalize'

export interface EnrichNpcSpeakingStyleOptions {
  fandomCharacterHint?: string
  settingLabel?: string
}

function namesMatchCaseInsensitive(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function resolveFandomCharacterHint(
  npcName: string,
  knownCharacters?: string[]
): string | undefined {
  if (!knownCharacters?.length) {
    return undefined
  }
  return knownCharacters.find((character) => namesMatchCaseInsensitive(character, npcName))
}

function toSpeakingStyleIdentity(
  npc: GeneratedNpc,
  opts?: EnrichNpcSpeakingStyleOptions
): Parameters<typeof generateNpcSpeakingStyle>[1] {
  return {
    name: npc.name,
    role: npc.role,
    disposition: npc.disposition,
    temperament: npc.temperament,
    alignment: npc.alignment ?? null,
    raceKey: npc.raceKey ?? null,
    genderKey: npc.genderKey ?? null,
    classKey: npc.classKey ?? null,
    backgroundKey: npc.backgroundKey ?? null,
    backstory: npc.backstory,
    settingLabel: opts?.settingLabel,
    fandomCharacterHint: opts?.fandomCharacterHint
  }
}

/**
 * 092.3 design (b): post-pass after one-shot NPC JSON normalize — speaking style is NOT
 * part of the LLM one-shot schema so create-contract fixtures stay stable for 092.6.
 */
export async function enrichNpcWithSpeakingStyle(
  provider: Provider,
  npc: GeneratedNpc,
  opts?: EnrichNpcSpeakingStyleOptions
): Promise<GeneratedNpc> {
  if (!npc.canSpeak) {
    return { ...npc, speakingStyleSpecimen: null, speakingStyleExamples: null }
  }
  if (npc.speakingStyleSpecimen?.trim()) {
    return npc
  }
  const sample = await generateNpcSpeakingStyle(provider, toSpeakingStyleIdentity(npc, opts))
  return {
    ...npc,
    speakingStyleSpecimen: sample.specimen,
    speakingStyleExamples: [...sample.examples]
  }
}

interface SpeakingStylePersistContext {
  knownCharacters?: string[]
  settingLabel?: string
}

async function enrichNpcForPersist(
  provider: Provider,
  npc: GeneratedNpc,
  ctx: SpeakingStylePersistContext
): Promise<GeneratedNpc> {
  const fandomCharacterHint =
    resolveFandomCharacterHint(npc.name, ctx.knownCharacters) ?? undefined
  return enrichNpcWithSpeakingStyle(provider, npc, {
    fandomCharacterHint,
    settingLabel: fandomCharacterHint ? ctx.settingLabel : undefined
  })
}

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

interface PersistGeneratedNpcInput {
  db: Database.Database
  provider: Provider
  campaignId: string
  regionId: string
  generatedNpc: GeneratedNpc
  ctx: SpeakingStylePersistContext
}

async function persistGeneratedNpc(input: PersistGeneratedNpcInput): Promise<void> {
  const { db, provider, campaignId, regionId, generatedNpc, ctx } = input
  await resolveNpcRaceIfSpeaking(db, provider, campaignId, generatedNpc)
  const enriched = await enrichNpcForPersist(provider, generatedNpc, ctx)
  await createNpcWithCombatReview(db, provider, {
    campaignId,
    regionId,
    name: enriched.name,
    role: enriched.role,
    disposition: enriched.disposition,
    alignment: enriched.alignment ?? null,
    temperament: enriched.temperament,
    canSpeak: enriched.canSpeak,
    backstory: enriched.backstory ?? '',
    raceKey: enriched.raceKey ?? null,
    backgroundKey: enriched.backgroundKey ?? null,
    genderKey: enriched.genderKey ?? null,
    classKey: enriched.classKey ?? null,
    speakingStyleSpecimen: enriched.speakingStyleSpecimen ?? null,
    speakingStyleExamples: enriched.speakingStyleExamples ?? null
  })
}

export async function persistRegionWithNpcs(input: PersistRegionWithNpcsInput): Promise<void> {
  const { db, provider, campaignId, generatedRegion, generatedNpcs } = input
  const ctx: SpeakingStylePersistContext = {
    knownCharacters: input.knownCharacters,
    settingLabel: input.settingLabel
  }
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
    await persistGeneratedNpc({ db, provider, campaignId, regionId: region.id, generatedNpc, ctx })
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
  knownCharacters?: string[]
  settingLabel?: string
}

async function persistCampaignNpcsFromGeneration(input: PersistCampaignNpcsInput): Promise<void> {
  const { db, provider, campaignId, npcs, regionIdsByName, regionNames } = input
  const ctx: SpeakingStylePersistContext = {
    knownCharacters: input.knownCharacters,
    settingLabel: input.settingLabel
  }
  for (const generatedNpc of npcs) {
    const resolvedRegionName =
      resolveGeneratedRegionName(generatedNpc.regionName, regionNames) ?? generatedNpc.regionName
    const regionId = regionIdsByName.get(resolvedRegionName)
    if (!regionId) {
      throw new CampaignGenerationSchemaError(
        `Generated NPC "${generatedNpc.name}" references unknown region "${generatedNpc.regionName}"`
      )
    }
    await persistGeneratedNpc({ db, provider, campaignId, regionId, generatedNpc, ctx })
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

async function persistGeneratedBestiary(args: {
  db: Database.Database
  provider: Provider
  campaignId: string
  bestiary: GeneratedBestiaryRoster
  settingHints?: string
}): Promise<void> {
  const { db, provider, campaignId, bestiary, settingHints } = args
  for (const foe of bestiary.foes) {
    await generateOrGetBestiarySpecies(db, provider, {
      campaignId,
      name: foe.name,
      buckets: foe.buckets,
      tags: foe.tags,
      settingHints,
      presetLore: foe.lore
    })
  }
}

function persistStoryThreadAndQuests(
  db: Database.Database,
  campaignId: string,
  storyThread: CampaignGenerationResult['storyThread']
): void {
  createStoryThread(db, {
    campaignId,
    title: storyThread.title,
    state: storyThread.state,
    summary: storyThread.summary
  })
  const [thread] = listStoryThreadsByCampaign(db, campaignId)
  if (!thread) {
    return
  }
  seedMainQuestForCampaign(db, {
    campaignId,
    storyThreadId: thread.id,
    title: thread.title,
    summary: thread.summary
  })
  importSideQuestsFromQuestHooks(db, campaignId)
}

export async function persistGeneratedCampaign(args: {
  db: Database.Database
  provider: Provider
  input: CampaignSetupInput
  generation: CampaignGenerationResult
  options?: PersistGeneratedCampaignOptions
}): Promise<Campaign> {
  const { db, provider, input, generation, options } = args
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
    regionNames: generation.regions.map((region) => region.name),
    knownCharacters: options?.knownCharacters,
    settingLabel: options?.settingLabel
  })
  await persistGeneratedBestiary({
    db,
    provider,
    campaignId: campaign.id,
    bestiary: generation.bestiary,
    settingHints: [input.premisePrompt, generation.world.worldName].filter(Boolean).join('\n')
  })
  persistStoryThreadAndQuests(db, campaign.id, generation.storyThread)
  return campaign
}
