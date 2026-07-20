import type { Bucket } from '../catalogTaxonomy'

export const BESTIARY_GENERATION_POINTS = ['prepped', 'on_quest', 'on_demand'] as const
export type BestiaryGenerationPoint = (typeof BESTIARY_GENERATION_POINTS)[number]

/**
 * Canonical variant vocabulary. Synonyms (documented in SPEC):
 * - `alpha` ≈ elevated pack leader; `elite` ≈ elevated singleton
 * - `cursed` ≈ thematic blight; `mutated` ≈ thematic rift/mutation
 */
export const BESTIARY_VARIANT_KEYS = [
  'standard',
  'alpha',
  'elite',
  'cursed',
  'mutated',
  'pack_runt'
] as const
export type BestiaryVariantKey = (typeof BESTIARY_VARIANT_KEYS)[number]

/**
 * Encounter start resolution order (116.9). Distinct from generation points:
 * generation seeds the bestiary; this order picks who enters combat.
 */
export const ENCOUNTER_START_PRECEDENCE = [
  'explicit_participants',
  'quest_prep',
  'region_hostiles',
  'on_demand'
] as const
export type EncounterStartStep = (typeof ENCOUNTER_START_PRECEDENCE)[number]

export const SPAWN_OUTCOME_KINDS = ['success', 'fallback_provisional', 'failed'] as const
export type SpawnOutcomeKind = (typeof SPAWN_OUTCOME_KINDS)[number]

export interface BestiarySpecies {
  id: string
  campaignId: string
  key: string
  name: string
  baseLore: string
  buckets: Bucket[]
  tags: string[]
  defaultCatalogKey: string | null
  createdAt?: string
  updatedAt?: string
}

export interface BestiaryVariant {
  variantKey: BestiaryVariantKey
  catalogKeyOverride?: string
  modifierProfileId?: string
  flavorBlurb?: string
}

/** Concrete `npcs` row linked to a species + variant (fiction display name on the NPC). */
export interface BestiaryInstanceRef {
  npcId: string
  speciesId: string
  variantKey: BestiaryVariantKey
  displayName: string
}

export interface CompositionSlot {
  speciesKey: string
  variantKey: BestiaryVariantKey
  count: number
}

export interface CompositionPlan {
  slots: CompositionSlot[]
  budgetSpent: number
  budgetMax: number
  thematicSignal?: string
}

export type SpawnOutcome =
  | { kind: 'success'; instanceNpcIds: string[] }
  | { kind: 'fallback_provisional'; instanceNpcIds: string[] }
  | { kind: 'failed'; reason: string }

export function isBestiaryGenerationPoint(value: unknown): value is BestiaryGenerationPoint {
  return typeof value === 'string' && (BESTIARY_GENERATION_POINTS as readonly string[]).includes(value)
}

export function parseBestiaryGenerationPoint(value: unknown): BestiaryGenerationPoint | undefined {
  return isBestiaryGenerationPoint(value) ? value : undefined
}

export function isBestiaryVariantKey(value: unknown): value is BestiaryVariantKey {
  return typeof value === 'string' && (BESTIARY_VARIANT_KEYS as readonly string[]).includes(value)
}

export function parseBestiaryVariantKey(value: unknown): BestiaryVariantKey | undefined {
  return isBestiaryVariantKey(value) ? value : undefined
}

export function isEncounterStartStep(value: unknown): value is EncounterStartStep {
  return typeof value === 'string' && (ENCOUNTER_START_PRECEDENCE as readonly string[]).includes(value)
}

export function isCompositionSlot(value: unknown): value is CompositionSlot {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record['speciesKey'] === 'string' &&
    record['speciesKey'].length > 0 &&
    isBestiaryVariantKey(record['variantKey']) &&
    typeof record['count'] === 'number' &&
    Number.isInteger(record['count']) &&
    record['count'] > 0
  )
}

export function parseCompositionSlot(value: unknown): CompositionSlot | undefined {
  return isCompositionSlot(value) ? value : undefined
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

export function isCompositionPlan(value: unknown): value is CompositionPlan {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (!Array.isArray(record['slots']) || record['slots'].length === 0) return false
  if (!record['slots'].every(isCompositionSlot)) return false
  if (!isNonNegativeInt(record['budgetSpent']) || !isNonNegativeInt(record['budgetMax'])) return false
  if (record['budgetSpent'] > record['budgetMax']) return false
  const signal = record['thematicSignal']
  return signal === undefined || typeof signal === 'string'
}

export function parseCompositionPlan(value: unknown): CompositionPlan | undefined {
  return isCompositionPlan(value) ? value : undefined
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((id) => typeof id === 'string' && id.length > 0)
}

export function isSpawnOutcome(value: unknown): value is SpawnOutcome {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  const kind = record['kind']
  if (kind === 'success' || kind === 'fallback_provisional') {
    return isNonEmptyStringArray(record['instanceNpcIds'])
  }
  if (kind === 'failed') {
    return typeof record['reason'] === 'string' && record['reason'].length > 0
  }
  return false
}

export function parseSpawnOutcome(value: unknown): SpawnOutcome | undefined {
  return isSpawnOutcome(value) ? value : undefined
}
