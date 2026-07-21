/** Section order is binding for UI and IPC consumers. */
export const DOSSIER_SECTION_ORDER = ['traits', 'facts', 'opinion', 'disposition'] as const
export type NpcDossierSection = (typeof DOSSIER_SECTION_ORDER)[number]

/** Identity bundle shown in the Traits section (Campaign Review labeling). */
export interface NpcDossierTraits {
  temperament: string
  raceKey: string | null
  alignment: string | null
  genderKey: string | null
  classKey: string | null
  backgroundKey: string | null
  role: string
  hairColor: string | null
  age: string | null
  eyeColor: string | null
}

/** Player-known fact from the active character's log book (`relatedEntityId = npcId`). */
export interface NpcDossierFact {
  id: string
  title: string
  content: string
  createdAt: string
}

/** Persisted DM opinion of how this NPC feels about the player. */
export interface NpcDossierOpinion {
  /** Null until first successful generation (or after a failed first attempt). */
  summary: string | null
  generatedAt: string | null
  /** True when the client should treat the summary as pending regeneration. */
  stale: boolean
}

/**
 * Full dossier payload for one NPC, scoped to the active character for Facts.
 * Nothing about other NPCs belongs here.
 */
export interface NpcDossierDto {
  npcId: string
  name: string
  role: string
  canSpeak: boolean
  /** Resolved absolute path when the asset exists on disk; null otherwise. */
  faceTokenPath: string | null
  traits: NpcDossierTraits
  facts: NpcDossierFact[]
  opinion: NpcDossierOpinion
  disposition: string
}

/** Persisted opinion columns on the NPC row (or dedicated table keyed by npc_id). */
export interface NpcOpinionPersistence {
  opinionSummary: string | null
  opinionSummaryGeneratedAt: string | null
  lastPlayerInteractionAt: string | null
}

/**
 * Opinion refresh rule (105.2 / 105.5):
 * - null summary → generate once
 * - lastPlayerInteractionAt > opinionSummaryGeneratedAt → regenerate
 * - otherwise return stored summary (no LLM)
 */
export function needsOpinionRegeneration(fields: NpcOpinionPersistence): boolean {
  if (fields.opinionSummary === null) {
    return true
  }
  if (fields.opinionSummaryGeneratedAt === null) {
    return true
  }
  if (fields.lastPlayerInteractionAt === null) {
    return false
  }
  return fields.lastPlayerInteractionAt > fields.opinionSummaryGeneratedAt
}

export function isNpcDossierSection(value: unknown): value is NpcDossierSection {
  return typeof value === 'string' && (DOSSIER_SECTION_ORDER as readonly string[]).includes(value)
}

export function parseNpcDossierSection(value: unknown): NpcDossierSection | undefined {
  return isNpcDossierSection(value) ? value : undefined
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function hasValidNpcDossierIdentityTraits(row: Record<string, unknown>): boolean {
  return (
    typeof row['temperament'] === 'string' &&
    isNullableString(row['raceKey']) &&
    isNullableString(row['alignment']) &&
    isNullableString(row['genderKey']) &&
    isNullableString(row['classKey']) &&
    isNullableString(row['backgroundKey']) &&
    typeof row['role'] === 'string'
  )
}

function hasValidNpcDossierAppearanceTraits(row: Record<string, unknown>): boolean {
  return (
    isNullableString(row['hairColor']) &&
    isNullableString(row['age']) &&
    isNullableString(row['eyeColor'])
  )
}

export function isNpcDossierTraits(value: unknown): value is NpcDossierTraits {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return hasValidNpcDossierIdentityTraits(row) && hasValidNpcDossierAppearanceTraits(row)
}

export function isNpcDossierFact(value: unknown): value is NpcDossierFact {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    typeof row['id'] === 'string' &&
    typeof row['title'] === 'string' &&
    typeof row['content'] === 'string' &&
    typeof row['createdAt'] === 'string'
  )
}

export function isNpcDossierOpinion(value: unknown): value is NpcDossierOpinion {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    isNullableString(row['summary']) &&
    isNullableString(row['generatedAt']) &&
    typeof row['stale'] === 'boolean'
  )
}

export function isNpcDossierDto(value: unknown): value is NpcDossierDto {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  if (!hasValidNpcDossierHeader(row) || !Array.isArray(row['facts'])) {
    return false
  }
  return row['facts'].every(isNpcDossierFact)
}

function hasValidNpcDossierHeader(row: Record<string, unknown>): boolean {
  return (
    typeof row['npcId'] === 'string' &&
    typeof row['name'] === 'string' &&
    typeof row['role'] === 'string' &&
    typeof row['canSpeak'] === 'boolean' &&
    isNullableString(row['faceTokenPath']) &&
    typeof row['disposition'] === 'string' &&
    isNpcDossierTraits(row['traits']) &&
    isNpcDossierOpinion(row['opinion'])
  )
}

export function parseNpcDossierDto(value: unknown): NpcDossierDto | undefined {
  return isNpcDossierDto(value) ? value : undefined
}
