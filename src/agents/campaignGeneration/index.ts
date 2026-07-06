import type Database from 'better-sqlite3'
import { tryParseJson } from '../jsonResponse'
import type { Provider } from '../providers/types'
import {
  isValidAdditionalRegionResult,
  isValidGeneratedSingleNpcResult,
  isValidGeneratedWorld,
  isValidGenerationResult,
  needsNpcTopUp,
  normalizeGeneratedWorld,
  normalizeRegionsGeneration,
  normalizeStoryThreadGeneration,
  normalizeAdditionalRegion,
  normalizeGeneratedSingleNpc,
  normalizeRegionName
} from './normalize'
import {
  buildAdditionalRegionPrompt,
  buildRegionsGenerationPrompt,
  buildSingleNpcPrompt,
  buildStoryThreadGenerationPrompt,
  buildWorldGenerationPrompt
} from './prompts'
import { persistGeneratedCampaign } from './persist'
import { buildAvailableRaceOptions } from '../raceLore'
import type { AvailableRaceOption } from '../../shared/raceSelection/types'
import {
  CampaignGenerationSchemaError,
  MAX_GENERATION_ATTEMPTS,
  resolveAdditionalRegionNpcCount,
  resolveInitialGenerationCounts
} from './types'
import type { Campaign } from '../../db/repositories/campaigns'
import type {
  AdditionalRegionRequest,
  AdditionalRegionResult,
  CampaignGenerationResult,
  CampaignSetupInput,
  GeneratedRegion,
  GeneratedSingleNpcResult,
  GeneratedStoryThread,
  GeneratedWorld,
  GenerationCounts,
  WorldContext
} from './types'

export * from './types'
export * from './normalize'
export * from './prompts'
export * from './persist'
export * from './flaggedNpc'

const WORLD_MAX_TOKENS = 4096
const REGIONS_MAX_TOKENS = 8192
const STORY_THREAD_MAX_TOKENS = 2048
const ADDITIONAL_REGION_MAX_TOKENS = 10240
const SINGLE_NPC_MAX_TOKENS = 4096

async function generateWithRetries<T>(input: {
  provider: Provider
  buildPrompt: () => string
  maxTokens: number
  normalize: (parsed: unknown) => T | undefined
  isValid: (value: T) => boolean
  errorMessage: string
}): Promise<T> {
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const raw = await input.provider.generate(input.buildPrompt(), { maxTokens: input.maxTokens })
    const parsed = tryParseJson(raw)
    const normalized = input.normalize(parsed)
    if (normalized && input.isValid(normalized)) {
      return normalized
    }
  }
  throw new CampaignGenerationSchemaError(input.errorMessage)
}

export async function generateCampaignWorld(
  provider: Provider,
  premisePrompt: string
): Promise<GeneratedWorld> {
  return generateWithRetries({
    provider,
    buildPrompt: () => buildWorldGenerationPrompt(premisePrompt),
    maxTokens: WORLD_MAX_TOKENS,
    normalize: normalizeGeneratedWorld,
    isValid: isValidGeneratedWorld,
    errorMessage: 'DM agent did not return a valid world schema after retries'
  })
}

export async function generateCampaignRegions(
  provider: Provider,
  premisePrompt: string,
  world: GeneratedWorld,
  counts: GenerationCounts
): Promise<GeneratedRegion[]> {
  if (counts.regionCount === 0) {
    return []
  }
  return generateWithRetries({
    provider,
    buildPrompt: () => buildRegionsGenerationPrompt(premisePrompt, world, counts),
    maxTokens: REGIONS_MAX_TOKENS,
    normalize: (parsed) => normalizeRegionsGeneration(parsed, counts),
    isValid: (regions) => regions.length === counts.regionCount,
    errorMessage: 'DM agent did not return a valid regions schema after retries'
  })
}

export async function generateCampaignStoryThread(
  provider: Provider,
  premisePrompt: string,
  world: GeneratedWorld,
  regions: GeneratedRegion[]
): Promise<GeneratedStoryThread> {
  const storyThread = await generateWithRetries({
    provider,
    buildPrompt: () => buildStoryThreadGenerationPrompt(premisePrompt, world, regions),
    maxTokens: STORY_THREAD_MAX_TOKENS,
    normalize: normalizeStoryThreadGeneration,
    isValid: (thread) =>
      typeof thread.title === 'string' &&
      typeof thread.state === 'string' &&
      typeof thread.summary === 'string',
    errorMessage: 'DM agent did not return a valid story thread schema after retries'
  })
  return storyThread
}

async function fillCampaignNpcShortfall(input: {
  provider: Provider
  premisePrompt: string
  world: GeneratedWorld
  partial: CampaignGenerationResult
  counts: GenerationCounts
  availableRaces: AvailableRaceOption[]
}): Promise<CampaignGenerationResult | undefined> {
  const { provider, premisePrompt, world, partial, counts, availableRaces } = input
  const npcs = [...partial.npcs]
  const allNames = (): string[] => npcs.map((npc) => npc.name)
  const worldContext: WorldContext = world

  for (const region of partial.regions) {
    const inRegion = npcs.filter((npc) => npc.regionName === region.name).length
    let shortfall = counts.npcsPerRegion - inRegion
    while (shortfall > 0) {
      try {
        const generated = await generateSingleNpc(provider, {
          campaignPremise: premisePrompt,
          regionName: region.name,
          regionDescription: region.description,
          existingNpcNames: allNames(),
          seedPrompt: `Create another distinct local character in ${region.name}.`,
          availableRaces,
          worldContext
        })
        npcs.push(generated.npc)
        shortfall -= 1
      } catch {
        return undefined
      }
    }
  }

  return { ...partial, npcs }
}

async function finalizeGenerationResult(args: {
  provider: Provider
  premisePrompt: string
  normalized: CampaignGenerationResult
  counts: GenerationCounts
  availableRaces: AvailableRaceOption[]
}): Promise<CampaignGenerationResult> {
  const { provider, premisePrompt, normalized, counts, availableRaces } = args
  if (!needsNpcTopUp(normalized, counts)) {
    return normalized
  }
  const repaired = await fillCampaignNpcShortfall({
    provider,
    premisePrompt,
    world: normalized.world,
    partial: normalized,
    counts,
    availableRaces
  })
  if (repaired && isValidGenerationResult(repaired, counts)) {
    return repaired
  }
  return normalized
}

async function generateNpcSlotForRegion(input: {
  provider: Provider
  premisePrompt: string
  world: GeneratedWorld
  region: GeneratedRegion
  existingNpcNames: string[]
  availableRaces: AvailableRaceOption[]
}): Promise<GeneratedSingleNpcResult['npc'] | undefined> {
  try {
    const generated = await attemptGenerateSingleNpc(input.provider, {
      campaignPremise: input.premisePrompt,
      regionName: input.region.name,
      regionDescription: input.region.description,
      existingNpcNames: input.existingNpcNames,
      seedPrompt: `Create a distinct local character who belongs in ${input.region.name}.`,
      availableRaces: input.availableRaces,
      worldContext: input.world
    })
    return generated?.npc
  } catch {
    return undefined
  }
}

async function generateNpcsForRegions(input: {
  provider: Provider
  premisePrompt: string
  world: GeneratedWorld
  regions: GeneratedRegion[]
  npcsPerRegion: number
  availableRaces: AvailableRaceOption[]
}): Promise<GeneratedSingleNpcResult['npc'][]> {
  const npcs: GeneratedSingleNpcResult['npc'][] = []

  for (const region of input.regions) {
    for (let slot = 0; slot < input.npcsPerRegion; slot += 1) {
      const generated = await generateNpcSlotForRegion({
        provider: input.provider,
        premisePrompt: input.premisePrompt,
        world: input.world,
        region,
        existingNpcNames: npcs.map((npc) => npc.name),
        availableRaces: input.availableRaces
      })
      if (generated) {
        npcs.push(generated)
      }
    }
  }

  return npcs
}

export async function generateCampaignSeed(
  provider: Provider,
  premisePrompt: string,
  countsInput?: Partial<GenerationCounts>,
  availableRaces: AvailableRaceOption[] = buildAvailableRaceOptions([])
): Promise<CampaignGenerationResult> {
  const counts = resolveInitialGenerationCounts(countsInput?.regionCount, countsInput?.npcsPerRegion)
  let lastLenient: CampaignGenerationResult | undefined

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const world = await generateCampaignWorld(provider, premisePrompt)
      const regions = await generateCampaignRegions(provider, premisePrompt, world, counts)
      const npcs =
        counts.regionCount === 0 || counts.npcsPerRegion === 0
          ? []
          : await generateNpcsForRegions({
              provider,
              premisePrompt,
              world,
              regions,
              npcsPerRegion: counts.npcsPerRegion,
              availableRaces
            })
      const storyThread = await generateCampaignStoryThread(provider, premisePrompt, world, regions)
      const normalized: CampaignGenerationResult = { world, regions, npcs, storyThread }

      if (!isValidGenerationResult(normalized, counts)) {
        continue
      }
      lastLenient = normalized
      return finalizeGenerationResult({ provider, premisePrompt, normalized, counts, availableRaces })
    } catch {
      continue
    }
  }

  if (lastLenient) {
    return lastLenient
  }
  throw new CampaignGenerationSchemaError(
    'DM agent did not return a valid campaign generation schema after retries'
  )
}

function regionNameCollides(name: string, existingRegionNames: string[]): boolean {
  const normalized = normalizeRegionName(name)
  return existingRegionNames.some((existing) => normalizeRegionName(existing) === normalized)
}

export async function generateAdditionalRegion(
  provider: Provider,
  campaignPremise: string,
  existingRegionNames: string[],
  request: AdditionalRegionRequest
): Promise<AdditionalRegionResult> {
  const npcCount = resolveAdditionalRegionNpcCount(request.npcCount)
  const availableRaces = request.availableRaces ?? buildAvailableRaceOptions([])
  const seedPrompt = request.seedPrompt
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(
      buildAdditionalRegionPrompt(campaignPremise, existingRegionNames, {
        seedPrompt,
        npcCount,
        history: request.history
      }, availableRaces),
      { maxTokens: ADDITIONAL_REGION_MAX_TOKENS }
    )
    const parsed = tryParseJson(raw)
    const normalized = normalizeAdditionalRegion(parsed, npcCount)
    if (
      normalized &&
      !regionNameCollides(normalized.region.name, existingRegionNames) &&
      isValidAdditionalRegionResult(normalized, npcCount)
    ) {
      return normalized
    }
  }
  throw new CampaignGenerationSchemaError(
    'DM agent did not return a valid additional region schema after retries'
  )
}

function npcNameCollides(name: string, existingNames: string[]): boolean {
  const normalized = normalizeRegionName(name)
  return existingNames.some((existing) => normalizeRegionName(existing) === normalized)
}

async function attemptGenerateSingleNpc(
  provider: Provider,
  input: {
    campaignPremise: string
    regionName: string
    regionDescription: string
    existingNpcNames: string[]
    seedPrompt: string
    availableRaces: AvailableRaceOption[]
    worldContext?: WorldContext
  }
): Promise<GeneratedSingleNpcResult | undefined> {
  const raw = await provider.generate(buildSingleNpcPrompt(input), {
    maxTokens: SINGLE_NPC_MAX_TOKENS
  })
  const parsed = tryParseJson(raw)
  const normalized = normalizeGeneratedSingleNpc(parsed, input.regionName)
  if (
    normalized &&
    !npcNameCollides(normalized.npc.name, input.existingNpcNames) &&
    isValidGeneratedSingleNpcResult(normalized, input.regionName)
  ) {
    return normalized
  }
  return undefined
}

export async function generateSingleNpc(
  provider: Provider,
  input: {
    campaignPremise: string
    regionName: string
    regionDescription: string
    existingNpcNames: string[]
    seedPrompt: string
    availableRaces: AvailableRaceOption[]
    worldContext?: WorldContext
  }
): Promise<GeneratedSingleNpcResult> {
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const normalized = await attemptGenerateSingleNpc(provider, input)
    if (normalized) {
      return normalized
    }
  }
  throw new CampaignGenerationSchemaError(
    'DM agent did not return a valid single NPC schema after retries'
  )
}

export async function generateAndPersistCampaign(
  db: Database.Database,
  provider: Provider,
  input: CampaignSetupInput
): Promise<Campaign> {
  const generation = await generateCampaignSeed(provider, input.premisePrompt, {
    regionCount: input.regionCount,
    npcsPerRegion: input.npcsPerRegion
  })
  return persistGeneratedCampaign(db, provider, input, generation)
}
