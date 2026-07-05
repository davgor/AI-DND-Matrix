import type Database from 'better-sqlite3'
import { tryParseJson } from '../jsonResponse'
import type { Provider } from '../providers/types'
import {
  isValidAdditionalRegionResult,
  isValidGeneratedSingleNpcResult,
  isValidGenerationResult,
  needsNpcTopUp,
  normalizeCampaignGeneration,
  normalizeAdditionalRegion,
  normalizeGeneratedSingleNpc,
  normalizeRegionName
} from './normalize'
import { buildAdditionalRegionPrompt, buildGenerationPrompt, buildSingleNpcPrompt } from './prompts'
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
  GeneratedSingleNpcResult,
  GenerationCounts
} from './types'

export * from './types'
export * from './normalize'
export * from './prompts'
export * from './persist'

const GENERATION_MAX_TOKENS = 10240
const ADDITIONAL_REGION_MAX_TOKENS = 10240
const SINGLE_NPC_MAX_TOKENS = 4096

async function fillCampaignNpcShortfall(input: {
  provider: Provider
  premisePrompt: string
  partial: CampaignGenerationResult
  counts: GenerationCounts
  availableRaces: AvailableRaceOption[]
}): Promise<CampaignGenerationResult | undefined> {
  const { provider, premisePrompt, partial, counts, availableRaces } = input
  const npcs = [...partial.npcs]
  const allNames = (): string[] => npcs.map((npc) => npc.name)

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
          availableRaces
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
    partial: normalized,
    counts,
    availableRaces
  })
  if (repaired && isValidGenerationResult(repaired, counts)) {
    return repaired
  }
  return normalized
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
    const raw = await provider.generate(buildGenerationPrompt(premisePrompt, counts, availableRaces), {
      maxTokens: GENERATION_MAX_TOKENS
    })
    const parsed = tryParseJson(raw)
    const normalized = normalizeCampaignGeneration(parsed, counts)
    if (!normalized || !isValidGenerationResult(normalized, counts)) {
      continue
    }
    lastLenient = normalized
    return finalizeGenerationResult({ provider, premisePrompt, normalized, counts, availableRaces })
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

export async function generateSingleNpc(
  provider: Provider,
  input: {
    campaignPremise: string
    regionName: string
    regionDescription: string
    existingNpcNames: string[]
    seedPrompt: string
    availableRaces: AvailableRaceOption[]
  }
): Promise<GeneratedSingleNpcResult> {
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
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
