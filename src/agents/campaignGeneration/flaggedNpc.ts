import type Database from 'better-sqlite3'
import { getCampaignById } from '../../db/repositories/campaigns'
import { listRegionHistoryByRegion } from '../../db/repositories/regionHistory'
import { GENDER_ROSTER, type GenderRosterEntry } from '../../shared/npcGender/types'
import { NPC_CLASS_ROSTER, type NpcClassRosterEntry } from '../../shared/npcClass/types'
import type { AvailableRaceOption, RaceLore } from '../../shared/raceSelection/types'
import type { Temperament } from '../../shared/alignment/types'
import { generateJsonWithRetry } from '../jsonResponse'
import { generateNpcSpeakingStyle } from '../npcSpeakingStyle'
import type { GenerateContext, Provider } from '../providers/types'
import { buildAgentSystemPrompt } from '../sharedSystemPrompts'
import { buildAvailableRaceOptions, resolveOrRealizeCampaignRace } from '../raceLore'
import {
  parseFlaggedNpcDetailsRecord,
  parseNpcCoreBundleRecord,
  resolveBundleBlurbs
} from './flaggedNpcParse'
import { listCampaignRaces } from '../../db/repositories/campaignRaces'
import { listDeitiesByCampaign } from '../../db/repositories/deities'
import { listFactionsByCampaign } from '../../db/repositories/factions'
import { buildFactionDigestLines } from '../../shared/factions/digest'
import { buildFlaggedNpcFinalPrompt, buildNpcCoreBundlePrompt } from './flaggedNpcPrompts'
import {
  formatDeityDigestLines,
  formatNpcFactionMembershipGuidance,
  formatWorldContextLines
} from './prompts'
import {
  CampaignGenerationSchemaError,
  MAX_GENERATION_ATTEMPTS,
  type GeneratedNpc,
  type GeneratedSingleNpcResult,
  type NpcCoreBundle
} from './types'

export { buildFlaggedNpcFinalPrompt, buildNpcCoreBundlePrompt } from './flaggedNpcPrompts'

// 040.13 (with 040.1 + 040.9): both flagged-NPC phases keep their tuned
// maxTokens and carry their JSON contract in GenerateContext.systemPrompt.
// Module-level constants so every schema-retry attempt passes the identical
// context object.

// 040.1: phase 1 returns only a tiny structured object ({canSpeak, temperament,
// race?, gender?, alignment?, class?, background?}) — the previous 2048 budget
// was sized for prose it never produces; 384 is the structured-JSON band.
const CORE_BUNDLE_GENERATE_CONTEXT: GenerateContext = {
  systemPrompt: buildAgentSystemPrompt({
    schemaFragment:
      '{"canSpeak":boolean,"temperament":string,"race"?:string,"gender"?:string,"alignment"?:string,"class"?:string,"background"?:string,"hairColor"?:string,"age"?:string,"eyeColor"?:string}',
    guidanceLines: [
      'Speaking NPCs (canSpeak true) must pick race, gender, alignment, class, and background from the available option lists in the user message.',
      'For speaking NPCs, optionally include short hairColor, age, and eyeColor strings when obvious from the seed.',
      'Beasts and mindless undead use canSpeak false and omit race, gender, alignment, class, and background.'
    ]
  }),
  maxTokens: 384,
  purpose: 'campaign.npc'
}

// Phase 2 writes the prose backstory; kept at 4096 (040.1) pending a measured cut.
const FINAL_NPC_MAX_TOKENS = 4096

const FINAL_SPEAKING_GENERATE_CONTEXT: GenerateContext = {
  systemPrompt: buildAgentSystemPrompt({
    schemaFragment:
      '{"name":string,"role":string,"disposition":string,"backstory":string,"factionKey"?:string,"membershipRole"?:string}',
    guidanceLines: [
      'backstory must be two short paragraphs tying the NPC to its region.',
      'Optional factionKey must match a campaign faction key; membershipRole is a short affiliation role.'
    ]
  }),
  maxTokens: FINAL_NPC_MAX_TOKENS,
  purpose: 'campaign.npc'
}

const FINAL_NON_SPEAKING_GENERATE_CONTEXT: GenerateContext = {
  systemPrompt: buildAgentSystemPrompt({
    schemaFragment:
      '{"name":string,"role":string,"disposition":string,"factionKey"?:string,"membershipRole"?:string}',
    guidanceLines: ['Omit backstory entirely (canSpeak is false).']
  }),
  maxTokens: FINAL_NPC_MAX_TOKENS,
  purpose: 'campaign.npc'
}

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
  return generateJsonWithRetry(
    provider,
    prompt,
    (parsed) => {
      if (typeof parsed !== 'object' || parsed === null) {
        return undefined
      }
      return parseNpcCoreBundleRecord(parsed as Record<string, unknown>, input.availableRaces) ?? undefined
    },
    {
      attempts: MAX_GENERATION_ATTEMPTS,
      context: CORE_BUNDLE_GENERATE_CONTEXT,
      exhaustedError: () =>
        new CampaignGenerationSchemaError('DM agent did not return a valid NPC core bundle after retries')
    }
  )
}

export async function generateFlaggedNpcDetails(
  provider: Provider,
  input: Parameters<typeof buildFlaggedNpcFinalPrompt>[0]
): Promise<{
  name: string
  role: string
  disposition: string
  backstory?: string
  factionKey?: string
  membershipRole?: string
}> {
  const prompt = buildFlaggedNpcFinalPrompt(input)
  const context = input.bundle.canSpeak
    ? FINAL_SPEAKING_GENERATE_CONTEXT
    : FINAL_NON_SPEAKING_GENERATE_CONTEXT
  return generateJsonWithRetry(
    provider,
    prompt,
    (parsed) => {
      if (typeof parsed !== 'object' || parsed === null) {
        return undefined
      }
      return (
        parseFlaggedNpcDetailsRecord(parsed as Record<string, unknown>, input.bundle) ?? undefined
      )
    },
    {
      attempts: MAX_GENERATION_ATTEMPTS,
      context,
      exhaustedError: () =>
        new CampaignGenerationSchemaError('DM agent did not return valid flagged NPC details after retries')
    }
  )
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
  // 040.13 (epic 040 data-integrity item 12): if phase 2 fails after this
  // call realized a new race, the campaign_races row is intentionally left in
  // place — it is benign and idempotent (the next NPC of that race
  // short-circuits the lore call via getCampaignRaceByKey). Do not add cleanup.
  const campaignRace = await resolveOrRealizeCampaignRace(db, provider, {
    campaignId,
    raceKey: bundle.raceKey
  })
  return { raceLabel: campaignRace.label, raceLore: campaignRace.lore }
}

function resolveFandomCharacterHint(
  seedPrompt: string,
  npcName: string,
  knownCharacters?: string[]
): string | undefined {
  if (!knownCharacters?.length) {
    return undefined
  }
  const seedLower = seedPrompt.toLowerCase()
  const nameLower = npcName.toLowerCase()
  for (const character of knownCharacters) {
    const characterLower = character.toLowerCase()
    if (
      seedLower.includes(characterLower) ||
      nameLower === characterLower ||
      nameLower.includes(characterLower)
    ) {
      return character
    }
  }
  return undefined
}

function assembleGeneratedNpc(
  input: { regionName: string; bundle: NpcCoreBundle },
  details: {
    name: string
    role: string
    disposition: string
    backstory?: string
    factionKey?: string
    membershipRole?: string
  }
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
    backgroundKey: input.bundle.backgroundKey,
    hairColor: input.bundle.hairColor ?? null,
    age: input.bundle.age ?? null,
    eyeColor: input.bundle.eyeColor ?? null,
    ...(details.factionKey ? { factionKey: details.factionKey } : {}),
    ...(details.membershipRole ? { membershipRole: details.membershipRole } : {})
  }
}

function loadDeityDigestLines(db: Database.Database, campaignId: string): string[] {
  const deities = listDeitiesByCampaign(db, campaignId)
  return formatDeityDigestLines(
    deities.map((deity) => ({
      name: deity.name,
      epithet: deity.epithet,
      domains: deity.domains,
      tenets: deity.tenets,
      blurb: deity.blurb,
      isForgotten: deity.isForgotten
    }))
  )
}

function loadFactionDigestLines(db: Database.Database, campaignId: string): string[] {
  const campaign = getCampaignById(db, campaignId)
  const factions = listFactionsByCampaign(db, campaignId)
  if (factions.length === 0) {
    return []
  }
  const deities = listDeitiesByCampaign(db, campaignId)
  const deityNamesById = Object.fromEntries(deities.map((deity) => [deity.id, deity.name]))
  const rosterLines = buildFactionDigestLines(factions, {
    enriched: false,
    deityNamesById
  })
  const sorted = [...factions].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  )
  const keyedLines = rosterLines.map((line, index) => {
    const faction = sorted[index]
    return faction ? `${faction.key}: ${line}` : line
  })
  const bias = formatNpcFactionMembershipGuidance(
    campaign?.factionPressure,
    factions.some((faction) => faction.kind === 'religious')
  )
  return [
    'Campaign factions (use factionKey from this roster when binding membership):',
    ...keyedLines,
    ...bias
  ]
}

function loadFlaggedWorldContext(
  db: Database.Database,
  campaignId: string
): {
  worldContextLines: string[]
  deityDigestLines: string[]
  factionDigestLines: string[]
} {
  const campaign = getCampaignById(db, campaignId)
  const worldContextLines =
    campaign && (campaign.worldName || campaign.worldSummary || campaign.worldHistory)
      ? formatWorldContextLines({
          worldName: campaign.worldName,
          worldSummary: campaign.worldSummary,
          worldHistory: campaign.worldHistory
        })
      : []
  return {
    worldContextLines,
    deityDigestLines: loadDeityDigestLines(db, campaignId),
    factionDigestLines: loadFactionDigestLines(db, campaignId)
  }
}

async function attachSpeakingStyleToGeneratedNpc(
  provider: Provider,
  npc: GeneratedNpc,
  input: { seedPrompt: string; knownCharacters?: string[]; settingLabel?: string }
): Promise<GeneratedNpc> {
  const fandomCharacterHint = resolveFandomCharacterHint(
    input.seedPrompt,
    npc.name,
    input.knownCharacters
  )
  const speakingStyle = await generateNpcSpeakingStyle(provider, {
    name: npc.name,
    role: npc.role,
    disposition: npc.disposition,
    temperament: npc.temperament,
    alignment: npc.alignment,
    raceKey: npc.raceKey,
    genderKey: npc.genderKey,
    classKey: npc.classKey,
    backgroundKey: npc.backgroundKey,
    backstory: npc.backstory,
    settingLabel: input.settingLabel,
    fandomCharacterHint
  })
  return {
    ...npc,
    speakingStyleSpecimen: speakingStyle.specimen,
    speakingStyleExamples: [...speakingStyle.examples]
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
    knownCharacters?: string[]
    settingLabel?: string
  }
): Promise<GeneratedSingleNpcResult> {
  const availableRaces = buildAvailableRaceOptions(listCampaignRaces(db, input.campaignId))
  const { worldContextLines, deityDigestLines, factionDigestLines } = loadFlaggedWorldContext(
    db,
    input.campaignId
  )
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
    worldContextLines,
    deityDigestLines,
    factionDigestLines,
    ...raceContext,
    ...resolveBundleBlurbs(bundle)
  })
  const npc = assembleGeneratedNpc({ regionName: input.regionName, bundle }, details)
  if (!npc.canSpeak) {
    return { npc }
  }
  return { npc: await attachSpeakingStyleToGeneratedNpc(provider, npc, input) }
}
