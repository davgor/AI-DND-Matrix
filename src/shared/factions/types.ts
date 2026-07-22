export const FACTION_KINDS = [
  'civic',
  'military',
  'mercantile',
  'criminal',
  'clandestine',
  'political',
  'religious'
] as const
export type FactionKind = (typeof FACTION_KINDS)[number]

export const FACTION_PRESSURES = ['light', 'medium', 'heavy'] as const
export type FactionPressure = (typeof FACTION_PRESSURES)[number]

export interface FactionPressureBand {
  minFactions: number
  maxFactions: number
  minRelations: number
  maxRelations: number
}

export const FACTION_PRESSURE_BANDS: Record<FactionPressure, FactionPressureBand> = {
  light: { minFactions: 2, maxFactions: 4, minRelations: 0, maxRelations: 2 },
  medium: { minFactions: 3, maxFactions: 7, minRelations: 2, maxRelations: 5 },
  heavy: { minFactions: 6, maxFactions: 10, minRelations: 4, maxRelations: 10 }
}

export const FACTION_RELATION_STANCES = ['ally', 'rival', 'tense', 'secret', 'war'] as const
export type FactionRelationStance = (typeof FACTION_RELATION_STANCES)[number]

export const FACTION_SOURCES = ['campaign_create', 'dm_play'] as const
export type FactionSource = (typeof FACTION_SOURCES)[number]

export const REPUTATION_BANDS = [
  'hostile',
  'unfriendly',
  'neutral',
  'friendly',
  'allied'
] as const
export type ReputationBand = (typeof REPUTATION_BANDS)[number]

export const REPUTATION_SCORE_MIN = -100 as const
export const REPUTATION_SCORE_MAX = 100 as const
export const REPUTATION_DELTA_MAX_ABS = 25 as const

export const FACTION_DIGEST_SLIM_MAX_LINES = 6 as const
export const FACTION_DIGEST_ENRICHED_MAX_LINES = 10 as const
export const FACTION_RELATION_DIGEST_SLIM_MAX = 4 as const
export const FACTION_RELATION_DIGEST_ENRICHED_MAX = 8 as const
export const FACTION_REPUTATION_DIGEST_MAX = 6 as const
export const FACTION_DIGEST_LINE_MAX_CHARS = 120 as const

/** Campaign-scoped faction entity (DB/IPC shape). */
export interface Faction {
  id: string
  campaignId: string
  key: string
  name: string
  kind: FactionKind
  summary: string
  motivation: string | null
  publicFace: string | null
  methods: string | null
  deityId: string | null
  homeRegionId: string | null
  sortOrder: number
  createdAt: string
  source: FactionSource
}

export interface FactionRelation {
  id: string
  campaignId: string
  factionAId: string
  factionBId: string
  stance: FactionRelationStance
  summary: string | null
  updatedAt: string
}

/** Per player character × faction standing. */
export interface CharacterFactionReputation {
  characterId: string
  factionId: string
  score: number
  band: ReputationBand
  updatedAt: string
  lastReason: string | null
}

export interface FactionProposal {
  key: string
  name: string
  kind: FactionKind
  summary: string
  motivation?: string
  publicFace?: string
  methods?: string
  deityId?: string
  deityKey?: string
  homeRegionId?: string
  homeRegionKey?: string
}

export interface ReputationUpdateProposal {
  characterId: string
  factionId?: string
  factionKey?: string
  delta: number
  reason?: string
}

export interface RelationUpdateProposal {
  factionAId?: string
  factionAKey?: string
  factionBId?: string
  factionBKey?: string
  stance: FactionRelationStance
  summary?: string
}

export interface NpcFactionUpdateProposal {
  npcId: string
  factionId?: string | null
  factionKey?: string | null
  membershipRole?: string | null
}

export interface DeityManifestationProposal {
  deityId?: string
  deityKey?: string
  regionId?: string
}

function includesString(list: readonly string[], value: unknown): value is string {
  return typeof value === 'string' && list.includes(value)
}

export function isFactionKind(value: unknown): value is FactionKind {
  return includesString(FACTION_KINDS, value)
}

export function parseFactionKind(value: unknown): FactionKind | undefined {
  return isFactionKind(value) ? value : undefined
}

export function isFactionPressure(value: unknown): value is FactionPressure {
  return includesString(FACTION_PRESSURES, value)
}

export function parseFactionPressure(value: unknown): FactionPressure | undefined {
  return isFactionPressure(value) ? value : undefined
}

export function isFactionRelationStance(value: unknown): value is FactionRelationStance {
  return includesString(FACTION_RELATION_STANCES, value)
}

export function parseFactionRelationStance(value: unknown): FactionRelationStance | undefined {
  return isFactionRelationStance(value) ? value : undefined
}

export function isFactionSource(value: unknown): value is FactionSource {
  return includesString(FACTION_SOURCES, value)
}

export function isReputationBand(value: unknown): value is ReputationBand {
  return includesString(REPUTATION_BANDS, value)
}

export function parseReputationBand(value: unknown): ReputationBand | undefined {
  return isReputationBand(value) ? value : undefined
}

export function pressureAllowsRosterCount(pressure: FactionPressure, count: number): boolean {
  const band = FACTION_PRESSURE_BANDS[pressure]
  return count >= band.minFactions && count <= band.maxFactions
}

export function canonicalFactionPair(
  idA: string,
  idB: string
): { factionAId: string; factionBId: string } | undefined {
  if (idA === idB) return undefined
  return idA < idB
    ? { factionAId: idA, factionBId: idB }
    : { factionAId: idB, factionBId: idA }
}

export function clampReputationScore(score: number): number {
  return Math.min(REPUTATION_SCORE_MAX, Math.max(REPUTATION_SCORE_MIN, Math.trunc(score)))
}

export function clampReputationDelta(delta: number): number {
  const truncated = Math.trunc(delta)
  if (truncated > REPUTATION_DELTA_MAX_ABS) return REPUTATION_DELTA_MAX_ABS
  if (truncated < -REPUTATION_DELTA_MAX_ABS) return -REPUTATION_DELTA_MAX_ABS
  return truncated
}

export function bandForReputationScore(score: number): ReputationBand {
  const clamped = clampReputationScore(score)
  if (clamped <= -51) return 'hostile'
  if (clamped <= -21) return 'unfriendly'
  if (clamped <= 20) return 'neutral'
  if (clamped <= 50) return 'friendly'
  return 'allied'
}

export function applyReputationDelta(
  currentScore: number,
  delta: number
): { score: number; band: ReputationBand } {
  const score = clampReputationScore(clampReputationScore(currentScore) + clampReputationDelta(delta))
  return { score, band: bandForReputationScore(score) }
}

export function shouldEnrichFactionDigest(input: {
  pressure: FactionPressure
  intrigueOrFaithTagged: boolean
}): boolean {
  return input.pressure === 'heavy' || input.intrigueOrFaithTagged
}
