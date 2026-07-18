import type Database from 'better-sqlite3'
import { tryParseJson } from '../jsonResponse'
import type { Provider } from '../providers/types'
import {
  meetsRegionTropeDiversity,
  meetsPremiseTropeDiversity,
  meetsWorldTropeDiversity
} from './tropeGuard'
import {
  isValidAdditionalRegionResult,
  isValidCanonRecall,
  isValidGeneratedPantheon,
  isValidGeneratedSingleNpcResult,
  isValidGeneratedWorld,
  isValidGenerationResult,
  needsNpcTopUp,
  nextPreferredCanonName,
  normalizeCanonRecall,
  normalizeGeneratedPantheon,
  normalizeGeneratedWorld,
  normalizeRegionsGeneration,
  normalizeStoryThreadGeneration,
  normalizeAdditionalRegion,
  normalizeGeneratedSingleNpc,
  normalizeRegionName
} from './normalize'
import {
  buildAdditionalRegionPrompt,
  buildCanonRecallPrompt,
  buildPantheonGenerationPrompt,
  buildRegionsGenerationPrompt,
  buildSingleNpcPrompt,
  buildStoryThreadGenerationPrompt,
  buildWorldGenerationPrompt
} from './prompts'
import { persistGeneratedCampaign } from './persist'
import { mapWithConcurrency } from './concurrency'
import { buildAvailableRaceOptions } from '../raceLore'
import type { AvailableRaceOption } from '../../shared/raceSelection/types'
import type { CreateCampaignProgressCallback } from '../../shared/campaignCreate/types'
import {
  CampaignGenerationSchemaError,
  MAX_CAMPAIGN_SEED_ATTEMPTS,
  MAX_GENERATION_ATTEMPTS,
  resolveAdditionalRegionNpcCount,
  resolveInitialGenerationCounts
} from './types'
import type { Campaign } from '../../db/repositories/campaigns'
import type {
  AdditionalRegionRequest,
  AdditionalRegionResult,
  CampaignGenerationResult,
  CanonRecall,
  CampaignSetupInput,
  GeneratedDeity,
  GeneratedNpc,
  GeneratedPantheon,
  GeneratedRegion,
  GeneratedSingleNpcResult,
  GeneratedStoryThread,
  GeneratedWorld,
  GenerationCounts,
  GenerateCampaignSeedOptions,
  WorldContext
} from './types'
import { EMPTY_CANON_RECALL } from './types'

export * from './types'
export { assembleCampaignHistoryContext } from './prompts'
export * from './persist'
export * from './flaggedNpc'
export * from './worldSummaryRegen'

const WORLD_MAX_TOKENS = 8192
const CANON_MAX_TOKENS = 2048
const PANTHEON_MAX_TOKENS = 8192
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
  premisePrompt: string,
  pantheon?: GeneratedPantheon
): Promise<GeneratedWorld> {
  return generateWithRetries({
    provider,
    buildPrompt: () => buildWorldGenerationPrompt(premisePrompt, pantheon),
    maxTokens: WORLD_MAX_TOKENS,
    normalize: normalizeGeneratedWorld,
    isValid: (world) => isValidGeneratedWorld(world) && meetsWorldTropeDiversity(world, premisePrompt),
    errorMessage: 'DM agent did not return a valid world schema after retries'
  })
}

/**
 * Soft stage: malformed recall falls back to empty lists so original premises never abort.
 * World context is optional so canon can run before world/pantheon.
 */
export async function generateCanonRecall(
  provider: Provider,
  premisePrompt: string,
  world?: GeneratedWorld
): Promise<CanonRecall> {
  try {
    return await generateWithRetries({
      provider,
      buildPrompt: () => buildCanonRecallPrompt(premisePrompt, world),
      maxTokens: CANON_MAX_TOKENS,
      normalize: normalizeCanonRecall,
      isValid: isValidCanonRecall,
      errorMessage: 'DM agent did not return a valid canon recall schema after retries'
    })
  } catch {
    return EMPTY_CANON_RECALL
  }
}

export async function generateCampaignPantheon(
  provider: Provider,
  premisePrompt: string,
  canon: CanonRecall = EMPTY_CANON_RECALL
): Promise<GeneratedPantheon> {
  return generateWithRetries({
    provider,
    buildPrompt: () => buildPantheonGenerationPrompt(premisePrompt, canon),
    maxTokens: PANTHEON_MAX_TOKENS,
    normalize: normalizeGeneratedPantheon,
    isValid: isValidGeneratedPantheon,
    errorMessage: 'DM agent did not return a valid pantheon schema after retries'
  })
}

export async function generateCampaignRegions(input: {
  provider: Provider
  premisePrompt: string
  world: GeneratedWorld
  counts: GenerationCounts
  canon?: CanonRecall
}): Promise<GeneratedRegion[]> {
  if (input.counts.regionCount === 0) {
    return []
  }
  const canon = input.canon ?? EMPTY_CANON_RECALL
  return generateWithRetries({
    provider: input.provider,
    buildPrompt: () =>
      buildRegionsGenerationPrompt(input.premisePrompt, input.world, input.counts, canon),
    maxTokens: REGIONS_MAX_TOKENS,
    normalize: (parsed) => normalizeRegionsGeneration(parsed, input.counts),
    isValid: (regions) =>
      regions.length === input.counts.regionCount &&
      regions.every((region) => meetsRegionTropeDiversity(region, input.premisePrompt)),
    errorMessage: 'DM agent did not return a valid regions schema after retries'
  })
}

export async function generateCampaignStoryThread(
  provider: Provider,
  premisePrompt: string,
  input: {
    world: GeneratedWorld
    regions: GeneratedRegion[]
    deities?: GeneratedDeity[]
  }
): Promise<GeneratedStoryThread> {
  const storyThread = await generateWithRetries({
    provider,
    buildPrompt: () =>
      buildStoryThreadGenerationPrompt(
        premisePrompt,
        input.world,
        input.regions,
        input.deities ?? []
      ),
    maxTokens: STORY_THREAD_MAX_TOKENS,
    normalize: normalizeStoryThreadGeneration,
    isValid: (thread) =>
      typeof thread.title === 'string' &&
      typeof thread.state === 'string' &&
      typeof thread.summary === 'string' &&
      meetsPremiseTropeDiversity(`${thread.title}\n${thread.state}\n${thread.summary}`, premisePrompt),
    errorMessage: 'DM agent did not return a valid story thread schema after retries'
  })
  return storyThread
}

/** In-flight cap for parallel shortfall single-NPC requests (rate-limit friendly). */
const SHORTFALL_FILL_CONCURRENCY = 4

interface ShortfallFillContext {
  provider: Provider
  premisePrompt: string
  worldContext: WorldContext
  availableRaces: AvailableRaceOption[]
  canon: CanonRecall
  deities: GeneratedDeity[]
}

/**
 * Generates one shortfall NPC for `region`, or `undefined` when generation
 * fails after retries.
 *
 * Failure semantics (deliberate 040.11 change): a failed single NPC no
 * longer discards the whole repair. Previously `fillCampaignNpcShortfall`
 * returned `undefined` on any single failure, throwing away every
 * successfully generated NPC; now the irrecoverable slot is skipped and all
 * successes are kept, so the fill can come back short of the target count.
 */
async function generateShortfallNpc(
  ctx: ShortfallFillContext,
  region: GeneratedRegion,
  existingNpcNames: string[]
): Promise<GeneratedNpc | undefined> {
  try {
    const preferredCanonName = nextPreferredCanonName(ctx.canon.knownCharacters, existingNpcNames)
    const generated = await generateSingleNpc(ctx.provider, {
      campaignPremise: ctx.premisePrompt,
      regionName: region.name,
      regionDescription: region.description,
      existingNpcNames,
      seedPrompt: preferredCanonName
        ? `Create ${preferredCanonName} as a distinct local character in ${region.name}.`
        : `Create another distinct local character in ${region.name}.`,
      availableRaces: ctx.availableRaces,
      worldContext: ctx.worldContext,
      canon: ctx.canon,
      preferredCanonName,
      deities: ctx.deities
    })
    return generated.npc
  } catch {
    return undefined
  }
}

/**
 * Second-pass collision resolution: concurrent candidates are generated
 * against the pre-batch name list and cannot see each other's in-flight
 * names, so two candidates in one batch may collide. A candidate whose name
 * collides with an already-accepted name is regenerated serially with the
 * up-to-date name list (`generateSingleNpc` itself rejects colliding names
 * and retries). An irrecoverable slot resolves to `undefined` and is skipped.
 */
async function resolveShortfallCollision(
  ctx: ShortfallFillContext,
  region: GeneratedRegion,
  candidate: GeneratedNpc | undefined,
  acceptedNames: string[]
): Promise<GeneratedNpc | undefined> {
  if (!candidate) {
    return undefined
  }
  if (!npcNameCollides(candidate.name, acceptedNames)) {
    return candidate
  }
  return generateShortfallNpc(ctx, region, acceptedNames)
}

async function fillRegionNpcShortfall(
  ctx: ShortfallFillContext,
  region: GeneratedRegion,
  shortfall: number,
  existingNpcNames: string[]
): Promise<GeneratedNpc[]> {
  // Phase 1: generate all candidates concurrently against the pre-batch names.
  const slots = Array.from({ length: shortfall }, (_, index) => index)
  const candidates = await mapWithConcurrency(slots, SHORTFALL_FILL_CONCURRENCY, () =>
    generateShortfallNpc(ctx, region, existingNpcNames)
  )
  // Phase 2: serial de-duplication — regenerate any name collisions.
  const accepted: GeneratedNpc[] = []
  const names = [...existingNpcNames]
  for (const candidate of candidates) {
    const resolved = await resolveShortfallCollision(ctx, region, candidate, names)
    if (resolved) {
      accepted.push(resolved)
      names.push(resolved.name)
    }
  }
  return accepted
}

/**
 * Tops up per-region NPC shortfalls with parallel single-NPC generation
 * (capped at SHORTFALL_FILL_CONCURRENCY in-flight requests per region batch).
 *
 * Collision strategy: generate first, then detect and resolve duplicate
 * names in a serial second pass (see `resolveShortfallCollision`), because
 * concurrent requests cannot see each other's in-flight names.
 *
 * Failure semantics: partial success — failed slots are skipped, successes
 * are kept (see `generateShortfallNpc`), so the result may still be short of
 * `counts.npcsPerRegion`; callers re-validate with `isValidGenerationResult`.
 *
 * Parallelism is confined to this pre-persist, in-memory fill. Persistence
 * (`persistCampaignNpcsFromGeneration` / `resolveOrRealizeCampaignRace`)
 * stays serial — the latter is check-then-insert against
 * UNIQUE(campaign_id, race_key) and would throw under concurrent same-race NPCs.
 */
async function fillCampaignNpcShortfall(input: {
  provider: Provider
  premisePrompt: string
  world: GeneratedWorld
  partial: CampaignGenerationResult
  counts: GenerationCounts
  availableRaces: AvailableRaceOption[]
  canon?: CanonRecall
}): Promise<CampaignGenerationResult> {
  const { provider, premisePrompt, world, partial, counts, availableRaces } = input
  const canon = input.canon ?? EMPTY_CANON_RECALL
  const ctx: ShortfallFillContext = {
    provider,
    premisePrompt,
    worldContext: world,
    availableRaces,
    canon,
    deities: partial.pantheon.deities
  }
  const npcs = [...partial.npcs]

  for (const region of partial.regions) {
    const inRegion = npcs.filter((npc) => npc.regionName === region.name).length
    const shortfall = counts.npcsPerRegion - inRegion
    if (shortfall <= 0) {
      continue
    }
    const filled = await fillRegionNpcShortfall(
      ctx,
      region,
      shortfall,
      npcs.map((npc) => npc.name)
    )
    npcs.push(...filled)
  }

  return { ...partial, npcs }
}

async function repairNpcShortfall(input: {
  provider: Provider
  premisePrompt: string
  normalized: CampaignGenerationResult
  counts: GenerationCounts
  availableRaces: AvailableRaceOption[]
  canon?: CanonRecall
}): Promise<CampaignGenerationResult> {
  const { provider, premisePrompt, normalized, counts, availableRaces } = input
  if (counts.regionCount === 0 || counts.npcsPerRegion === 0 || !needsNpcTopUp(normalized, counts)) {
    return normalized
  }
  // Partial fills are kept as-is (040.11): the repaired result is at worst
  // equal to `normalized`, never smaller.
  return fillCampaignNpcShortfall({
    provider,
    premisePrompt,
    world: normalized.world,
    partial: normalized,
    counts,
    availableRaces,
    canon: input.canon
  })
}

async function finalizeGenerationResult(args: {
  provider: Provider
  premisePrompt: string
  normalized: CampaignGenerationResult
  counts: GenerationCounts
  availableRaces: AvailableRaceOption[]
  canon?: CanonRecall
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
    availableRaces,
    canon: args.canon
  })
  if (isValidGenerationResult(repaired, counts)) {
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
  canon: CanonRecall
  deities: GeneratedDeity[]
}): Promise<GeneratedSingleNpcResult['npc'] | undefined> {
  const preferredCanonName = nextPreferredCanonName(
    input.canon.knownCharacters,
    input.existingNpcNames
  )
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const generated = await attemptGenerateSingleNpc(input.provider, {
        campaignPremise: input.premisePrompt,
        regionName: input.region.name,
        regionDescription: input.region.description,
        existingNpcNames: input.existingNpcNames,
        seedPrompt: preferredCanonName
          ? `Create ${preferredCanonName} as a distinct local character who belongs in ${input.region.name}.`
          : `Create a distinct local character who belongs in ${input.region.name}.`,
        availableRaces: input.availableRaces,
        worldContext: input.world,
        canon: input.canon,
        preferredCanonName,
        deities: input.deities
      })
      if (generated) {
        return generated.npc
      }
    } catch {
      continue
    }
  }
  return undefined
}

async function generateNpcsForRegions(input: {
  provider: Provider
  premisePrompt: string
  world: GeneratedWorld
  regions: GeneratedRegion[]
  npcsPerRegion: number
  availableRaces: AvailableRaceOption[]
  canon: CanonRecall
  deities: GeneratedDeity[]
  onNpcRegionStart?: () => void
}): Promise<GeneratedSingleNpcResult['npc'][]> {
  const npcs: GeneratedSingleNpcResult['npc'][] = []

  for (const region of input.regions) {
    input.onNpcRegionStart?.()
    for (let slot = 0; slot < input.npcsPerRegion; slot += 1) {
      const generated = await generateNpcSlotForRegion({
        provider: input.provider,
        premisePrompt: input.premisePrompt,
        world: input.world,
        region,
        existingNpcNames: npcs.map((npc) => npc.name),
        availableRaces: input.availableRaces,
        canon: input.canon,
        deities: input.deities
      })
      if (generated) {
        npcs.push(generated)
      }
    }
  }

  return npcs
}

async function generateSeedNpcs(input: {
  provider: Provider
  premisePrompt: string
  world: GeneratedWorld
  regions: GeneratedRegion[]
  counts: GenerationCounts
  availableRaces: AvailableRaceOption[]
  canon: CanonRecall
  deities: GeneratedDeity[]
  onNpcRegionStart?: () => void
}): Promise<GeneratedSingleNpcResult['npc'][]> {
  if (input.counts.regionCount === 0 || input.counts.npcsPerRegion === 0) {
    return []
  }
  return generateNpcsForRegions({
    provider: input.provider,
    premisePrompt: input.premisePrompt,
    world: input.world,
    regions: input.regions,
    npcsPerRegion: input.counts.npcsPerRegion,
    availableRaces: input.availableRaces,
    canon: input.canon,
    deities: input.deities,
    onNpcRegionStart: input.onNpcRegionStart
  })
}

async function runCampaignSeedAttempt(input: {
  provider: Provider
  premisePrompt: string
  counts: GenerationCounts
  availableRaces: AvailableRaceOption[]
  onProgress?: CreateCampaignProgressCallback
}): Promise<CampaignGenerationResult> {
  input.onProgress?.('canon')
  const canon = await generateCanonRecall(input.provider, input.premisePrompt)
  input.onProgress?.('pantheon')
  const pantheon = await generateCampaignPantheon(input.provider, input.premisePrompt, canon)
  input.onProgress?.('world')
  const world = await generateCampaignWorld(input.provider, input.premisePrompt, pantheon)
  input.onProgress?.('regions')
  const regions = await generateCampaignRegions({
    provider: input.provider,
    premisePrompt: input.premisePrompt,
    world,
    counts: input.counts,
    canon
  })
  input.onProgress?.('npcs')
  const npcs = await generateSeedNpcs({
    provider: input.provider,
    premisePrompt: input.premisePrompt,
    world,
    regions,
    counts: input.counts,
    availableRaces: input.availableRaces,
    canon,
    deities: pantheon.deities,
    onNpcRegionStart: () => input.onProgress?.('npcs')
  })
  input.onProgress?.('story')
  const storyThread = await generateCampaignStoryThread(input.provider, input.premisePrompt, {
    world,
    regions,
    deities: pantheon.deities
  })
  return repairNpcShortfall({
    provider: input.provider,
    premisePrompt: input.premisePrompt,
    normalized: { world, pantheon, regions, npcs, storyThread },
    counts: input.counts,
    availableRaces: input.availableRaces,
    canon
  })
}

export async function generateCampaignSeed(
  provider: Provider,
  premisePrompt: string,
  options?: GenerateCampaignSeedOptions
): Promise<CampaignGenerationResult> {
  return runCampaignSeedWithRetries({
    provider,
    premisePrompt,
    counts: resolveInitialGenerationCounts(options?.regionCount, options?.npcsPerRegion),
    availableRaces: options?.availableRaces ?? buildAvailableRaceOptions([]),
    onProgress: options?.onProgress
  })
}

async function runCampaignSeedWithRetries(input: {
  provider: Provider
  premisePrompt: string
  counts: GenerationCounts
  availableRaces: AvailableRaceOption[]
  onProgress?: CreateCampaignProgressCallback
}): Promise<CampaignGenerationResult> {
  let lastLenient: CampaignGenerationResult | undefined

  for (let attempt = 1; attempt <= MAX_CAMPAIGN_SEED_ATTEMPTS; attempt += 1) {
    const normalized = await tryCampaignSeedAttempt(input)
    if (!normalized) {
      continue
    }
    lastLenient = normalized
    if (!isValidGenerationResult(normalized, input.counts)) {
      continue
    }
    return finalizeGenerationResult({
      provider: input.provider,
      premisePrompt: input.premisePrompt,
      normalized,
      counts: input.counts,
      availableRaces: input.availableRaces
    })
  }

  if (lastLenient) {
    const repaired = await repairNpcShortfall({
      provider: input.provider,
      premisePrompt: input.premisePrompt,
      normalized: lastLenient,
      counts: input.counts,
      availableRaces: input.availableRaces
    })
    if (isValidGenerationResult(repaired, input.counts)) {
      return repaired
    }
  }

  throw new CampaignGenerationSchemaError(
    'DM agent did not return a valid campaign generation schema after retries'
  )
}

async function tryCampaignSeedAttempt(input: {
  provider: Provider
  premisePrompt: string
  counts: GenerationCounts
  availableRaces: AvailableRaceOption[]
  onProgress?: CreateCampaignProgressCallback
}): Promise<CampaignGenerationResult | undefined> {
  try {
    return await runCampaignSeedAttempt(input)
  } catch {
    return undefined
  }
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
        history: request.history,
        deities: request.deities
      }, availableRaces),
      { maxTokens: ADDITIONAL_REGION_MAX_TOKENS }
    )
    const parsed = tryParseJson(raw)
    const normalized = normalizeAdditionalRegion(parsed, npcCount)
    if (
      normalized &&
      !regionNameCollides(normalized.region.name, existingRegionNames) &&
      isValidAdditionalRegionResult(normalized, npcCount) &&
      meetsRegionTropeDiversity(
        normalized.region,
        [campaignPremise, seedPrompt].filter(Boolean).join('\n')
      )
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
    canon?: CanonRecall
    preferredCanonName?: string
    deities?: GeneratedDeity[]
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
    canon?: CanonRecall
    preferredCanonName?: string
    deities?: GeneratedDeity[]
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
