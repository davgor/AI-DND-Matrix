import { parseAlignment, parseTemperament, type Temperament } from '../../shared/alignment/types'
import { parseBackgroundKey } from '../../shared/characterBackground/types'
import { parseGenderKey } from '../../shared/npcGender/types'
import { parseNpcClassKey } from '../../shared/npcClass/types'
import { isPresetRaceKey, RACE_ROSTER } from '../../engine/raceSelection/roster'
import { DEFAULT_ADDITIONAL_REGION_NPC_COUNT } from '../../shared/campaignCreate/types'
import type {
  AdditionalRegionResult,
  CampaignGenerationResult,
  GeneratedNpc,
  GeneratedRegion,
  GeneratedSingleNpcResult,
  GeneratedStoryThread,
  GeneratedWorld,
  GenerationCounts
} from './types'
import { resolveInitialGenerationCounts } from './types'

const MIN_NPCS_PER_REGION_WHEN_NONZERO = 1
const MIN_QUEST_HOOKS = 1
const MAX_QUEST_HOOKS = 4
const MIN_WORLD_SUMMARY_PARAGRAPHS = 3
const MIN_WORLD_HISTORY_PARAGRAPHS = 5
const MIN_WORLD_SUMMARY_SENTENCES_PER_PARAGRAPH = 2
const MIN_WORLD_HISTORY_SENTENCES_PER_PARAGRAPH = 3

// ---------------------------------------------------------------------------
// World normalization
// ---------------------------------------------------------------------------

export function splitParagraphs(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) {
    return []
  }
  const byBlankLine = trimmed
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  if (byBlankLine.length > 1) {
    return byBlankLine
  }
  return trimmed
    .split(/\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

export function countParagraphs(text: string): number {
  return splitParagraphs(text).length
}

export function countSentences(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) {
    return 0
  }
  const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)
  return sentences?.filter((part) => part.trim().length > 0).length ?? 0
}

const WORLD_PAD_SENTENCE =
  'The realm still carries scars and stories that locals trade over firelight when the roads grow quiet.'

const WORLD_PARAGRAPH_EXPANSION_SENTENCES = [
  'Travelers still tell the tale around hearths when trade routes grow dangerous.',
  'Older chronicles disagree on names, but every version ends in the same uneasy truce.',
  'That uneasy truce still shapes what merchants, priests, and free companies dare to attempt today.'
]

function expandParagraphToMinSentences(paragraph: string, minSentences: number): string {
  let result = paragraph.trim()
  let expansionIndex = 0
  while (countSentences(result) < minSentences) {
    const extra = WORLD_PARAGRAPH_EXPANSION_SENTENCES[expansionIndex % WORLD_PARAGRAPH_EXPANSION_SENTENCES.length]!
    result = `${result} ${extra}`
    expansionIndex += 1
  }
  return result
}

export function padWorldProse(
  text: string,
  minParagraphs: number,
  minSentencesPerParagraph = 1
): string {
  let paragraphs = splitParagraphs(text.trim())
  while (paragraphs.length < minParagraphs) {
    paragraphs.push(WORLD_PAD_SENTENCE)
  }
  if (minSentencesPerParagraph > 1) {
    paragraphs = paragraphs.map((paragraph) =>
      expandParagraphToMinSentences(paragraph, minSentencesPerParagraph)
    )
  }
  return paragraphs.join('\n\n')
}

export function normalizeRaceKeyForRoster(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_')
  if (isPresetRaceKey(key)) {
    return key
  }
  const byLabel = RACE_ROSTER.find((entry) => entry.label.toLowerCase() === raw.trim().toLowerCase())
  return byLabel?.key ?? 'human'
}

export function coerceNpcTemperament(value: unknown): Temperament {
  return parseTemperament(value) ?? 'neutral'
}

export function normalizeGeneratedWorld(value: unknown): GeneratedWorld | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const record = value as Record<string, unknown>
  const worldName = readString(record, 'worldName', 'world_name', 'name')
  const worldSummary = readString(record, 'worldSummary', 'world_summary', 'summary')
  const worldHistory = readString(record, 'worldHistory', 'world_history', 'history')
  if (!worldName || !worldSummary || !worldHistory) {
    return undefined
  }
  const paddedSummary = padWorldProse(
    worldSummary,
    MIN_WORLD_SUMMARY_PARAGRAPHS,
    MIN_WORLD_SUMMARY_SENTENCES_PER_PARAGRAPH
  )
  const paddedHistory = padWorldProse(
    worldHistory,
    MIN_WORLD_HISTORY_PARAGRAPHS,
    MIN_WORLD_HISTORY_SENTENCES_PER_PARAGRAPH
  )
  return { worldName, worldSummary: paddedSummary, worldHistory: paddedHistory }
}

export function meetsWorldHistoryProseStandards(worldHistory: string): boolean {
  const paragraphs = splitParagraphs(worldHistory)
  if (paragraphs.length < MIN_WORLD_HISTORY_PARAGRAPHS) {
    return false
  }
  return paragraphs.every(
    (paragraph) => countSentences(paragraph) >= MIN_WORLD_HISTORY_SENTENCES_PER_PARAGRAPH
  )
}

export function isValidGeneratedWorld(value: unknown): value is GeneratedWorld {
  const normalized = normalizeGeneratedWorld(value)
  return normalized !== undefined && meetsWorldHistoryProseStandards(normalized.worldHistory)
}

export function normalizeRegionsGeneration(
  value: unknown,
  counts: GenerationCounts = resolveInitialGenerationCounts()
): GeneratedRegion[] | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  return resolveRegions(value as Record<string, unknown>, counts)
}

export function normalizeStoryThreadGeneration(value: unknown): GeneratedStoryThread | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const record = value as Record<string, unknown>
  return normalizeGeneratedStoryThread(
    record['storyThread'] ?? record['story_thread'] ?? record['mainStoryThread'] ?? record
  )
}

function defaultLegacyWorld(): GeneratedWorld {
  return {
    worldName: 'Unnamed World',
    worldSummary:
      'Summary paragraph one.\n\nSummary paragraph two.\n\nSummary paragraph three.',
    worldHistory:
      'History paragraph one.\n\nHistory paragraph two.\n\nHistory paragraph three.\n\nHistory paragraph four.\n\nHistory paragraph five.'
  }
}

// ---------------------------------------------------------------------------

function readString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

function readStringArray(record: Record<string, unknown>, ...keys: string[]): string[] {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return [value.trim()]
    }
    if (Array.isArray(value)) {
      const items = value
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .map((entry) => entry.trim())
      if (items.length > 0) {
        return items
      }
    }
  }
  return []
}

export function readCanSpeak(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Region name helpers
// ---------------------------------------------------------------------------

export function normalizeRegionName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function resolveRegionName(candidate: string, regionNames: string[]): string | undefined {
  if (regionNames.includes(candidate)) {
    return candidate
  }
  const normalizedCandidate = normalizeRegionName(candidate)
  return regionNames.find((name) => normalizeRegionName(name) === normalizedCandidate)
}

/** @internal shared with persistence */
export function resolveGeneratedRegionName(candidate: string, regionNames: string[]): string | undefined {
  return resolveRegionName(candidate, regionNames)
}

// ---------------------------------------------------------------------------
// Region normalization
// ---------------------------------------------------------------------------

function defaultRecentHistory(regionName: string): string {
  return `Recent months have brought new rumors and restless activity around ${regionName}.`
}

function defaultQuestHooks(regionName: string): string[] {
  return [
    `Investigate a mystery drawing attention to ${regionName}.`,
    `Aid locals caught up in a conflict or opportunity near ${regionName}.`
  ]
}

function normalizeGeneratedRegion(value: unknown): GeneratedRegion | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const record = value as Record<string, unknown>
  const name = readString(record, 'name')
  const description = readString(record, 'description')
  const historyBackstory = readString(
    record,
    'historyBackstory',
    'history_backstory',
    'backstory',
    'history'
  )
  if (!name || !description || !historyBackstory) {
    return undefined
  }

  const recentHistory =
    readString(record, 'recentHistory', 'recent_history', 'recentEvents', 'recent_events') ??
    defaultRecentHistory(name)

  let potentialQuests = readStringArray(
    record,
    'potentialQuests',
    'potential_quests',
    'quests',
    'questHooks',
    'quest_hooks'
  )
  if (potentialQuests.length < MIN_QUEST_HOOKS) {
    potentialQuests = defaultQuestHooks(name)
  }
  if (potentialQuests.length > MAX_QUEST_HOOKS) {
    potentialQuests = potentialQuests.slice(0, MAX_QUEST_HOOKS)
  }

  return { name, description, historyBackstory, recentHistory, potentialQuests }
}

// ---------------------------------------------------------------------------
// NPC normalization
// ---------------------------------------------------------------------------

function readNpcGenderKey(record: Record<string, unknown>): string | undefined {
  const raw = readString(record, 'gender', 'genderKey', 'gender_key')
  return raw ? parseGenderKey(raw) : undefined
}

function readNpcClassKey(record: Record<string, unknown>): string | undefined {
  const raw = readString(record, 'class', 'classKey', 'class_key')
  return raw ? parseNpcClassKey(raw) : undefined
}

function readNpcBackgroundKey(record: Record<string, unknown>): string | undefined {
  const raw = readString(record, 'background', 'backgroundKey', 'background_key')
  return raw ? parseBackgroundKey(raw) : undefined
}

function readSpeakingNpcBehaviorFields(
  record: Record<string, unknown>
): Pick<
  GeneratedNpc,
  'alignment' | 'backstory' | 'raceKey' | 'backgroundKey' | 'genderKey' | 'classKey'
> | undefined {
  const alignment = parseAlignment(record['alignment'])
  const backstory = readString(record, 'backstory')
  const rawRace = readString(record, 'race', 'raceKey', 'race_key')
  const backgroundKey = readNpcBackgroundKey(record)
  const genderKey = readNpcGenderKey(record)
  const classKey = readNpcClassKey(record)
  const raceKey = rawRace ? normalizeRaceKeyForRoster(rawRace) : undefined
  if (!alignment || !backstory || !raceKey || !backgroundKey || !genderKey || !classKey) {
    return undefined
  }
  return { alignment, backstory, raceKey, backgroundKey, genderKey, classKey }
}

function readNpcBehaviorFields(
  record: Record<string, unknown>
): Pick<
  GeneratedNpc,
  | 'temperament'
  | 'canSpeak'
  | 'alignment'
  | 'backstory'
  | 'raceKey'
  | 'backgroundKey'
  | 'genderKey'
  | 'classKey'
> | undefined {
  const temperament = coerceNpcTemperament(record['temperament'])
  const canSpeak = readCanSpeak(record['canSpeak'] ?? record['can_speak'])
  if (canSpeak === undefined) {
    return undefined
  }
  if (!canSpeak) {
    return { temperament, canSpeak }
  }
  const speaking = readSpeakingNpcBehaviorFields(record)
  return speaking ? { temperament, canSpeak, ...speaking } : undefined
}

/** @internal test hook */
export function normalizeGeneratedNpc(value: unknown): GeneratedNpc | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const record = value as Record<string, unknown>
  const name = readString(record, 'name')
  const role = readString(record, 'role')
  const disposition = readString(record, 'disposition')
  const regionName = readString(record, 'regionName', 'region_name', 'region')
  const behavior = readNpcBehaviorFields(record)
  if (!name || !role || !disposition || !regionName || !behavior) {
    return undefined
  }
  return { name, role, disposition, regionName, ...behavior }
}

function normalizeGeneratedStoryThread(value: unknown): GeneratedStoryThread | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const record = value as Record<string, unknown>
  const title = readString(record, 'title')
  const state = readString(record, 'state')
  const summary = readString(record, 'summary')
  if (!title || !state || !summary) {
    return undefined
  }
  return { title, state, summary }
}

// ---------------------------------------------------------------------------
// NPC list grouping
// ---------------------------------------------------------------------------

function assignNpcsToRegions(
  npcs: GeneratedNpc[],
  regionNames: string[],
  grouped: Map<string, GeneratedNpc[]>
): void {
  for (const npc of npcs) {
    const resolvedRegion = resolveRegionName(npc.regionName, regionNames)
    if (!resolvedRegion) {
      continue
    }
    grouped.get(resolvedRegion)!.push({ ...npc, regionName: resolvedRegion })
  }
}

export function minNpcsPerRegion(npcsPerRegion: number): number {
  return npcsPerRegion > 0 ? MIN_NPCS_PER_REGION_WHEN_NONZERO : 0
}

function sliceNpcsPerRegion(
  regionNames: string[],
  grouped: Map<string, GeneratedNpc[]>,
  npcsPerRegion: number
): GeneratedNpc[] | undefined {
  const normalized: GeneratedNpc[] = []
  const minRequired = minNpcsPerRegion(npcsPerRegion)
  for (const regionName of regionNames) {
    const regionNpcs = grouped.get(regionName) ?? []
    if (regionNpcs.length < minRequired) {
      return undefined
    }
    normalized.push(...regionNpcs.slice(0, npcsPerRegion))
  }
  return normalized
}

function normalizeNpcList(
  npcs: GeneratedNpc[],
  regionNames: string[],
  npcsPerRegion: number
): GeneratedNpc[] | undefined {
  if (regionNames.length === 0) {
    return npcs.length === 0 ? [] : undefined
  }
  if (npcsPerRegion === 0) {
    return npcs.length === 0 ? [] : undefined
  }

  const grouped = new Map<string, GeneratedNpc[]>()
  for (const regionName of regionNames) {
    grouped.set(regionName, [])
  }
  assignNpcsToRegions(npcs, regionNames, grouped)
  return sliceNpcsPerRegion(regionNames, grouped, npcsPerRegion)
}

function parseGenerationNpcs(
  candidate: Record<string, unknown>,
  regionNames: string[],
  npcsPerRegion: number
): GeneratedNpc[] | undefined {
  const rawNpcs = candidate['npcs']
  if (!Array.isArray(rawNpcs)) {
    return undefined
  }
  const parsedNpcs = rawNpcs
    .map((npc) => normalizeGeneratedNpc(npc))
    .filter((npc): npc is GeneratedNpc => npc !== undefined)
  return normalizeNpcList(parsedNpcs, regionNames, npcsPerRegion)
}

// ---------------------------------------------------------------------------
// Top-level normalizers (exported)
// ---------------------------------------------------------------------------

function resolveRegions(
  candidate: Record<string, unknown>,
  counts: GenerationCounts
): GeneratedRegion[] | undefined {
  const rawRegions = candidate['regions']
  if (!Array.isArray(rawRegions)) {
    return undefined
  }
  let regions = rawRegions
    .map((region) => normalizeGeneratedRegion(region))
    .filter((region): region is GeneratedRegion => region !== undefined)
  if (counts.regionCount === 0) {
    if (regions.length !== 0) {
      return undefined
    }
  } else if (regions.length < counts.regionCount) {
    return undefined
  } else {
    regions = regions.slice(0, counts.regionCount)
  }
  return regions
}

export function normalizeCampaignGeneration(
  value: unknown,
  counts: GenerationCounts = resolveInitialGenerationCounts()
): CampaignGenerationResult | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const candidate = value as Record<string, unknown>
  const regions = resolveRegions(candidate, counts)
  if (!regions) {
    return undefined
  }

  const regionNames = regions.map((region) => region.name)
  const npcs = parseGenerationNpcs(candidate, regionNames, counts.npcsPerRegion)
  if (!npcs) {
    return undefined
  }

  const storyThread = normalizeGeneratedStoryThread(
    candidate['storyThread'] ?? candidate['story_thread'] ?? candidate['mainStoryThread']
  )
  if (!storyThread) {
    return undefined
  }

  const world = normalizeGeneratedWorld(candidate['world']) ?? defaultLegacyWorld()

  return { world, regions, npcs, storyThread }
}

/** @internal test hook */
export function normalizeAdditionalRegion(
  value: unknown,
  npcCount: number = DEFAULT_ADDITIONAL_REGION_NPC_COUNT
): AdditionalRegionResult | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const candidate = value as Record<string, unknown>
  const region = normalizeGeneratedRegion(candidate['region'])
  if (!region) {
    return undefined
  }
  const rawNpcs = candidate['npcs']
  if (!Array.isArray(rawNpcs)) {
    return undefined
  }
  const parsedNpcs = rawNpcs
    .map((npc) => normalizeGeneratedNpc(npc))
    .filter((npc): npc is GeneratedNpc => npc !== undefined)
  const npcs = normalizeNpcList(parsedNpcs, [region.name], npcCount)
  if (!npcs) {
    return undefined
  }
  return { region, npcs }
}

/** @internal test hook */
export function normalizeGeneratedSingleNpc(
  value: unknown,
  regionName: string
): GeneratedSingleNpcResult | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const candidate = value as Record<string, unknown>
  const rawNpc = candidate['npc'] ?? candidate
  const npc = normalizeGeneratedNpc(rawNpc)
  if (!npc) {
    return undefined
  }
  const resolvedRegion = resolveRegionName(npc.regionName, [regionName])
  if (!resolvedRegion) {
    return undefined
  }
  return { npc: { ...npc, regionName: resolvedRegion } }
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function isStringArray(value: unknown, min: number, max: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    value.every((entry) => typeof entry === 'string' && entry.trim().length > 0)
  )
}

function isGeneratedRegion(value: unknown): value is GeneratedRegion {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const r = value as Record<string, unknown>
  return (
    typeof r['name'] === 'string' &&
    typeof r['description'] === 'string' &&
    typeof r['historyBackstory'] === 'string' &&
    typeof r['recentHistory'] === 'string' &&
    isStringArray(r['potentialQuests'], MIN_QUEST_HOOKS, MAX_QUEST_HOOKS)
  )
}

function hasValidNpcBackstory(n: Record<string, unknown>): boolean {
  const canSpeak = readCanSpeak(n['canSpeak'] ?? n['can_speak'])
  return canSpeak === false || (typeof n['backstory'] === 'string' && n['backstory'].trim().length > 0)
}

function hasValidNpcAlignment(n: Record<string, unknown>): boolean {
  const canSpeak = readCanSpeak(n['canSpeak'] ?? n['can_speak'])
  return canSpeak === false || parseAlignment(n['alignment']) !== undefined
}

export function hasValidNpcRace(n: Record<string, unknown>): boolean {
  const canSpeak = readCanSpeak(n['canSpeak'] ?? n['can_speak'])
  return canSpeak === false || readString(n, 'race', 'raceKey', 'race_key') !== undefined
}

export function hasValidNpcBackground(n: Record<string, unknown>): boolean {
  const canSpeak = readCanSpeak(n['canSpeak'] ?? n['can_speak'])
  return canSpeak === false || readNpcBackgroundKey(n) !== undefined
}

export function hasValidNpcGender(n: Record<string, unknown>): boolean {
  const canSpeak = readCanSpeak(n['canSpeak'] ?? n['can_speak'])
  return canSpeak === false || readNpcGenderKey(n) !== undefined
}

export function hasValidNpcClass(n: Record<string, unknown>): boolean {
  const canSpeak = readCanSpeak(n['canSpeak'] ?? n['can_speak'])
  return canSpeak === false || readNpcClassKey(n) !== undefined
}

function hasValidNpcTemperament(n: Record<string, unknown>): boolean {
  return coerceNpcTemperament(n['temperament']) !== undefined
}

function hasValidNpcStringFields(n: Record<string, unknown>): boolean {
  return (
    typeof n['name'] === 'string' &&
    typeof n['role'] === 'string' &&
    typeof n['disposition'] === 'string' &&
    typeof n['regionName'] === 'string'
  )
}

function hasValidSpeakingNpcBundle(n: Record<string, unknown>): boolean {
  return (
    hasValidNpcRace(n) &&
    hasValidNpcBackground(n) &&
    hasValidNpcGender(n) &&
    hasValidNpcClass(n)
  )
}

function isGeneratedNpc(value: unknown): value is GeneratedNpc {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const n = value as Record<string, unknown>
  return (
    hasValidNpcStringFields(n) &&
    hasValidNpcTemperament(n) &&
    readCanSpeak(n['canSpeak'] ?? n['can_speak']) !== undefined &&
    hasValidNpcBackstory(n) &&
    hasValidNpcAlignment(n) &&
    hasValidSpeakingNpcBundle(n)
  )
}

function isGeneratedStoryThread(value: unknown): value is GeneratedStoryThread {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const t = value as Record<string, unknown>
  return (
    typeof t['title'] === 'string' &&
    typeof t['state'] === 'string' &&
    typeof t['summary'] === 'string'
  )
}

function isValidRegionList(value: unknown, regionCount: number): value is GeneratedRegion[] {
  return Array.isArray(value) && value.length === regionCount && value.every(isGeneratedRegion)
}

function hasEnoughNpcsPerRegion(
  regions: GeneratedRegion[],
  npcs: GeneratedNpc[],
  npcsPerRegion: number
): boolean {
  if (regions.length === 0) {
    return npcs.length === 0
  }
  if (npcsPerRegion === 0) {
    return npcs.length === 0
  }
  const minRequired = minNpcsPerRegion(npcsPerRegion)
  const counts = new Map(regions.map((region) => [region.name, 0]))
  for (const npc of npcs) {
    if (!counts.has(npc.regionName)) {
      return false
    }
    counts.set(npc.regionName, (counts.get(npc.regionName) ?? 0) + 1)
  }
  return [...counts.values()].every((count) => count >= minRequired && count <= npcsPerRegion)
}

export function needsNpcTopUp(result: CampaignGenerationResult, counts: GenerationCounts): boolean {
  if (counts.npcsPerRegion === 0 || counts.regionCount === 0) {
    return false
  }
  const byRegion = new Map<string, number>()
  for (const npc of result.npcs) {
    byRegion.set(npc.regionName, (byRegion.get(npc.regionName) ?? 0) + 1)
  }
  return result.regions.some((region) => (byRegion.get(region.name) ?? 0) < counts.npcsPerRegion)
}

function isValidNpcList(value: unknown, regionNames: Set<string>): value is GeneratedNpc[] {
  if (!Array.isArray(value) || !value.every(isGeneratedNpc)) {
    return false
  }
  return value.every((npc) => regionNames.has(npc.regionName))
}

export function isValidGenerationResult(
  value: unknown,
  counts: GenerationCounts
): value is CampaignGenerationResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  const regions = candidate['regions']
  if (!isValidRegionList(regions, counts.regionCount)) {
    return false
  }
  const regionNames = new Set(regions.map((region) => region.name))
  const npcs = candidate['npcs']
  if (
    !isValidNpcList(npcs, regionNames) ||
    !hasEnoughNpcsPerRegion(regions, npcs, counts.npcsPerRegion)
  ) {
    return false
  }
  if (!isValidGeneratedWorld(candidate['world'])) {
    return false
  }
  return isGeneratedStoryThread(candidate['storyThread'])
}

export function isValidAdditionalRegionResult(
  value: unknown,
  npcCount: number
): value is AdditionalRegionResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  const region = candidate['region']
  const npcs = candidate['npcs']
  if (!isGeneratedRegion(region) || !Array.isArray(npcs)) {
    return false
  }
  if (npcCount === 0) {
    return npcs.length === 0
  }
  if (npcs.length !== npcCount) {
    return false
  }
  return npcs.every((npc) => isGeneratedNpc(npc) && npc.regionName === region.name)
}

export function isValidGeneratedSingleNpcResult(
  value: unknown,
  regionName: string
): value is GeneratedSingleNpcResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  const rawNpc = candidate['npc'] ?? candidate
  if (!isGeneratedNpc(rawNpc)) {
    return false
  }
  return rawNpc.regionName === regionName
}
