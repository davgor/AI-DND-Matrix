import type Database from 'better-sqlite3'
import { resolveOrRealizeCampaignRace } from '../raceLore'
import { generateNpcSpeakingStyle } from '../npcSpeakingStyle'
import { generateOrGetBestiarySpecies } from '../bestiary/generateSpecies'
import {
  createCampaign,
  updateCampaignFactionPressure,
  updateCampaignFactionsSummary,
  type Campaign
} from '../../db/repositories/campaigns'
import { createDeity, listDeitiesByCampaign } from '../../db/repositories/deities'
import {
  createFaction,
  createFactionRelation,
  getFactionByKey,
  type CreateFactionInput
} from '../../db/repositories/factions'
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
  GeneratedFaction,
  GeneratedFactions,
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

function buildGeneratedNpcAppearanceFields(enriched: GeneratedNpc) {
  return {
    hairColor: enriched.hairColor ?? null,
    age: enriched.age ?? null,
    eyeColor: enriched.eyeColor ?? null
  }
}

function resolveNpcFactionMembership(
  db: Database.Database,
  campaignId: string,
  npc: GeneratedNpc
): { factionId: string | null; factionMembershipRole: string | null } {
  const key = npc.factionKey?.trim()
  if (!key) {
    return { factionId: null, factionMembershipRole: null }
  }
  const faction = getFactionByKey(db, campaignId, key)
  if (!faction) {
    return { factionId: null, factionMembershipRole: null }
  }
  return {
    factionId: faction.id,
    factionMembershipRole: npc.membershipRole?.trim() || null
  }
}

function buildCreateNpcInputFromGenerated(
  db: Database.Database,
  campaignId: string,
  regionId: string,
  enriched: GeneratedNpc
): Parameters<typeof createNpcWithCombatReview>[2] {
  return {
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
    speakingStyleExamples: enriched.speakingStyleExamples ?? null,
    ...buildGeneratedNpcAppearanceFields(enriched),
    ...resolveNpcFactionMembership(db, campaignId, enriched)
  }
}

async function persistGeneratedNpc(input: PersistGeneratedNpcInput): Promise<void> {
  const { db, provider, campaignId, regionId, generatedNpc, ctx } = input
  await resolveNpcRaceIfSpeaking(db, provider, campaignId, generatedNpc)
  const enriched = await enrichNpcForPersist(provider, generatedNpc, ctx)
  await createNpcWithCombatReview(
    db,
    provider,
    buildCreateNpcInputFromGenerated(db, campaignId, regionId, enriched)
  )
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

function resolveDeityIdByName(
  deities: Array<{ id: string; name: string }>,
  deityName: string | undefined
): string | null {
  if (!deityName?.trim()) {
    return null
  }
  const needle = deityName.trim().toLowerCase()
  const match = deities.find((deity) => deity.name.trim().toLowerCase() === needle)
  return match?.id ?? null
}

function buildCreateFactionInput(
  campaignId: string,
  faction: GeneratedFaction,
  index: number,
  deityId: string | null
): CreateFactionInput {
  return {
    campaignId,
    key: faction.key,
    name: faction.name,
    kind: faction.kind,
    summary: faction.summary,
    motivation: faction.motivation ?? null,
    publicFace: faction.publicFace ?? null,
    methods: faction.methods ?? null,
    deityId,
    homeRegionId: null,
    sortOrder: faction.sortOrder ?? index,
    source: 'campaign_create'
  }
}

function persistFactionRoster(
  db: Database.Database,
  campaignId: string,
  factions: GeneratedFaction[],
  deities: Array<{ id: string; name: string }>
): Map<string, string> {
  const idsByKey = new Map<string, string>()
  for (const [index, faction] of factions.entries()) {
    const deityId = resolveDeityIdByName(deities, faction.deityName)
    const created = createFaction(
      db,
      buildCreateFactionInput(campaignId, faction, index, deityId)
    )
    idsByKey.set(faction.key, created.id)
  }
  return idsByKey
}

function persistFactionRelations(
  db: Database.Database,
  campaignId: string,
  factions: GeneratedFactions,
  idsByKey: Map<string, string>
): void {
  for (const relation of factions.relations) {
    const factionAId = idsByKey.get(relation.factionAKey)
    const factionBId = idsByKey.get(relation.factionBKey)
    if (!factionAId || !factionBId) {
      continue
    }
    createFactionRelation(db, {
      campaignId,
      factionAId,
      factionBId,
      stance: relation.stance,
      summary: relation.summary ?? null
    })
  }
}

function persistGeneratedFactions(
  db: Database.Database,
  campaignId: string,
  factions: GeneratedFactions
): void {
  updateCampaignFactionsSummary(db, campaignId, factions.factionsSummary)
  updateCampaignFactionPressure(db, campaignId, factions.factionPressure)
  const deities = listDeitiesByCampaign(db, campaignId)
  const idsByKey = persistFactionRoster(db, campaignId, factions.factions, deities)
  persistFactionRelations(db, campaignId, factions, idsByKey)
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
    pantheonSummary: generation.pantheon.pantheonSummary,
    npcFaceTokenGenerationEnabled: input.npcFaceTokenGenerationEnabled === true,
    enemyTokenGenerationEnabled: input.enemyTokenGenerationEnabled === true
  })

  persistGeneratedPantheon(db, campaign.id, generation.pantheon)
  persistGeneratedFactions(db, campaign.id, generation.factions)
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
