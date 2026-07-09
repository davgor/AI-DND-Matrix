import type Database from 'better-sqlite3'
import { getCampaignById } from '../../db/repositories/campaigns'
import { listRegionHistoryByRegion } from '../../db/repositories/regionHistory'
import { GENDER_ROSTER, type GenderRosterEntry } from '../../shared/npcGender/types'
import { NPC_CLASS_ROSTER, type NpcClassRosterEntry } from '../../shared/npcClass/types'
import type { AvailableRaceOption, RaceLore } from '../../shared/raceSelection/types'
import type { Temperament } from '../../shared/alignment/types'
import { tryParseJson } from '../jsonResponse'
import type { Provider } from '../providers/types'
import { buildAvailableRaceOptions, resolveOrRealizeCampaignRace } from '../raceLore'
import {
  parseFlaggedNpcDetailsRecord,
  parseNpcCoreBundleRecord,
  resolveBundleBlurbs
} from './flaggedNpcParse'
import { listCampaignRaces } from '../../db/repositories/campaignRaces'
import { buildFlaggedNpcFinalPrompt, buildNpcCoreBundlePrompt } from './flaggedNpcPrompts'
import { formatWorldContextLines } from './prompts'
import {
  CampaignGenerationSchemaError,
  MAX_GENERATION_ATTEMPTS,
  type GeneratedNpc,
  type GeneratedSingleNpcResult,
  type NpcCoreBundle
} from './types'

export { buildFlaggedNpcFinalPrompt, buildNpcCoreBundlePrompt } from './flaggedNpcPrompts'

// 040.1: phase 1 returns only a tiny structured object ({canSpeak, temperament,
// race?, gender?, alignment?, class?, background?}) — the previous 2048 budget
// was sized for prose it never produces; 384 is the structured-JSON band.
const CORE_BUNDLE_MAX_TOKENS = 384
// Phase 2 writes the prose backstory; left at 4096 until 040.13 measures it.
const FINAL_NPC_MAX_TOKENS = 4096

export async function generateNpcCoreBundle(
  provider: Provider,
  input: {
    regionName: string
    regionDescription: string
    seedPrompt: string
    availableRaces: AvailableRaceOption[]
    availableGenders?: GenderRosterEntry[]
    availableClasses?: NpcClassRosterEntry[]
  }
): Promise<NpcCoreBundle> {
  const availableGenders = input.availableGenders ?? GENDER_ROSTER
  const availableClasses = input.availableClasses ?? NPC_CLASS_ROSTER
  const prompt = buildNpcCoreBundlePrompt({ ...input, availableGenders, availableClasses })
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(prompt, { maxTokens: CORE_BUNDLE_MAX_TOKENS })
    const parsed = tryParseJson(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      const bundle = parseNpcCoreBundleRecord(parsed as Record<string, unknown>, input.availableRaces)
      if (bundle) {
        return bundle
      }
    }
  }
  throw new CampaignGenerationSchemaError('DM agent did not return a valid NPC core bundle after retries')
}

export async function generateFlaggedNpcDetails(
  provider: Provider,
  input: Parameters<typeof buildFlaggedNpcFinalPrompt>[0]
): Promise<{ name: string; role: string; disposition: string; backstory?: string }> {
  const prompt = buildFlaggedNpcFinalPrompt(input)
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(prompt, { maxTokens: FINAL_NPC_MAX_TOKENS })
    const parsed = tryParseJson(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      const details = parseFlaggedNpcDetailsRecord(parsed as Record<string, unknown>, input.bundle)
      if (details) {
        return details
      }
    }
  }
  throw new CampaignGenerationSchemaError('DM agent did not return valid flagged NPC details after retries')
}

async function resolveRaceContext(
  db: Database.Database,
  provider: Provider,
  campaignId: string,
  bundle: NpcCoreBundle
): Promise<{ raceLabel?: string; raceLore?: RaceLore }> {
  if (!bundle.canSpeak || !bundle.raceKey) {
    return {}
  }
  const campaignRace = await resolveOrRealizeCampaignRace(db, provider, {
    campaignId,
    raceKey: bundle.raceKey
  })
  return { raceLabel: campaignRace.label, raceLore: campaignRace.lore }
}

function assembleGeneratedNpc(
  input: { regionName: string; bundle: NpcCoreBundle },
  details: { name: string; role: string; disposition: string; backstory?: string }
): GeneratedNpc {
  return {
    name: details.name,
    role: details.role,
    disposition: details.disposition,
    regionName: input.regionName,
    temperament: input.bundle.temperament as Temperament,
    canSpeak: input.bundle.canSpeak,
    backstory: details.backstory,
    alignment: input.bundle.alignment,
    raceKey: input.bundle.raceKey,
    genderKey: input.bundle.genderKey,
    classKey: input.bundle.classKey,
    backgroundKey: input.bundle.backgroundKey
  }
}

export async function generateFlaggedNpc(
  db: Database.Database,
  provider: Provider,
  input: {
    campaignId: string
    regionId: string
    regionName: string
    regionDescription: string
    seedPrompt: string
    existingNpcNames: string[]
  }
): Promise<GeneratedSingleNpcResult> {
  const availableRaces = buildAvailableRaceOptions(listCampaignRaces(db, input.campaignId))
  const campaign = getCampaignById(db, input.campaignId)
  const worldLines =
    campaign && (campaign.worldName || campaign.worldSummary || campaign.worldHistory)
      ? formatWorldContextLines({
          worldName: campaign.worldName,
          worldSummary: campaign.worldSummary,
          worldHistory: campaign.worldHistory
        })
      : []
  const bundle = await generateNpcCoreBundle(provider, {
    regionName: input.regionName,
    regionDescription: input.regionDescription,
    seedPrompt: input.seedPrompt,
    availableRaces
  })
  const raceContext = await resolveRaceContext(db, provider, input.campaignId, bundle)
  const regionHistory = listRegionHistoryByRegion(db, input.regionId).map((entry) => entry.content)
  const details = await generateFlaggedNpcDetails(provider, {
    regionName: input.regionName,
    regionDescription: input.regionDescription,
    regionHistory,
    seedPrompt: input.seedPrompt,
    existingNpcNames: input.existingNpcNames,
    bundle,
    worldContextLines: worldLines,
    ...raceContext,
    ...resolveBundleBlurbs(bundle)
  })
  return { npc: assembleGeneratedNpc({ regionName: input.regionName, bundle }, details) }
}
