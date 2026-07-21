/**
 * Shared contract for prompt-generated AI party companions (epic **129**).
 * Implementation of phase machine / IPC / agents lands in later 129.x tickets.
 */

/** Canonical guided-creation phase inserted after equipment, before identity. */
export const COMPANIONS_GUIDED_PHASE = 'companions' as const
export type CompanionsGuidedPhase = typeof COMPANIONS_GUIDED_PHASE

export const COMPANIONS_PHASE_AFTER = 'equipment' as const
export const COMPANIONS_PHASE_BEFORE = 'identity' as const

/** Documented slice of GUIDED_CREATION_PHASES once 129.2 wires the phase in. */
export const COMPANIONS_PHASE_ORDER_SLICE = [
  COMPANIONS_PHASE_AFTER,
  COMPANIONS_GUIDED_PHASE,
  COMPANIONS_PHASE_BEFORE
] as const

/** Hard max companions accepted on the onboarding step (v1). Promotion (011) may add more later. */
export const COMPANION_ONBOARDING_MAX = 1 as const

/** Soft ceiling if a later ticket cheaply allows a second accept before identity. */
export const COMPANION_ONBOARDING_SOFT_MAX = 2 as const

/** Face-token / image pipeline entity kind — not a world NPC. */
export const COMPANION_FACE_TOKEN_ENTITY_KIND = 'ai_party_member' as const

/** Metering purpose for prompt→generate (setup bucket). Must match `LLM_PURPOSE_IDS`. */
export const COMPANION_GENERATE_LLM_PURPOSE = 'onboarding.companion_generate' as const

export const COMPANION_PERSONALITY_MAX_CHARS = 500 as const
export const COMPANION_ORDER_MAX_CHARS = 200 as const
export const COMPANION_FALLBACK_RACE_KEY = 'human' as const

export interface CompanionAppearanceTraits {
  hairColor: string | null
  age: string | null
  eyeColor: string | null
}

/** PC grounding injected into the generate agent (and echoed on the preview digest). */
export interface CompanionGeneratePcContext {
  playerCharacterId: string
  name: string
  raceKey: string | null
  backgroundKey: string | null
  archetype: string
  gearSummary: string
}

/**
 * Agent proposal before engine clamp.
 * Ability scores are ignored when present — engine rolls on Accept (129.3 / 129.4).
 */
export interface CompanionAgentProposal {
  name: string
  characterClass: string
  personality: string
  raceKey: string
  role?: string
  appearance?: Partial<CompanionAppearanceTraits> | null
  inventoryItemIds?: string[] | null
  /** Ignored by clamp; engine owns combat stats. */
  abilityScores?: Record<string, number> | null
}

/** Clamped preview returned to the UI — not persisted until Accept. */
export interface CompanionPreviewDto {
  name: string
  characterClass: string
  personality: string
  raceKey: string
  role: string
  appearance: CompanionAppearanceTraits
  inventoryItemIds: string[]
  ownerPlayerCharacterId: string
  pcContextDigest: string
}

export interface CompanionClampCatalog {
  knownRaceKeys: readonly string[]
  knownInventoryItemIds: readonly string[]
}

export interface CompanionIdentityDigest {
  name: string
  role: string
  raceKey: string
  characterClass: string
}

export interface CompanionIdentityDigestSource {
  name: string
  characterClass: string
  raceKey: string | null
  stats: unknown
}

/** Short player order/stance that grounds `decidePartyMemberAction` (129.6). */
export interface CompanionOrderStance {
  text: string
  setAt: string
  /** Optional expiry ISO; null/omit = until cleared or scene change per play wiring. */
  expiresAt?: string | null
}

export function readCompanionOrderFromStats(
  stats: Record<string, unknown>
): CompanionOrderStance | null {
  const raw = stats['companionOrder']
  if (raw === null || typeof raw !== 'object') {
    return null
  }
  const row = raw as Record<string, unknown>
  if (typeof row['text'] !== 'string' || typeof row['setAt'] !== 'string') {
    return null
  }
  const text = trimToMax(row['text'], COMPANION_ORDER_MAX_CHARS)
  if (text.length === 0) {
    return null
  }
  return {
    text,
    setAt: row['setAt'],
    expiresAt: typeof row['expiresAt'] === 'string' || row['expiresAt'] === null ? row['expiresAt'] : undefined
  }
}

export function isCompanionOrderActive(
  order: CompanionOrderStance | null,
  nowIso: string
): order is CompanionOrderStance {
  if (!order) {
    return false
  }
  if (!order.expiresAt) {
    return true
  }
  return order.expiresAt > nowIso
}

export function buildCompanionOrderStance(text: string, setAt: string): CompanionOrderStance | null {
  const trimmed = trimToMax(text, COMPANION_ORDER_MAX_CHARS)
  if (trimmed.length === 0) {
    return null
  }
  return { text: trimmed, setAt }
}

export interface CompanionFaceTokenEnqueueRequest {
  entityKind: typeof COMPANION_FACE_TOKEN_ENTITY_KIND
  companionId: string
  appearance: CompanionAppearanceTraits
}

export function shouldEnqueueCompanionFaceToken(toggleEnabled: boolean): boolean {
  return toggleEnabled === true
}

function trimToMax(value: string, max: number): string {
  const trimmed = value.trim()
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max)
}

function nullableAppearanceField(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeAppearance(
  appearance: Partial<CompanionAppearanceTraits> | null | undefined
): CompanionAppearanceTraits {
  return {
    hairColor: nullableAppearanceField(appearance?.hairColor),
    age: nullableAppearanceField(appearance?.age),
    eyeColor: nullableAppearanceField(appearance?.eyeColor)
  }
}

function resolveRaceKey(raceKey: string, knownRaceKeys: readonly string[]): string {
  const trimmed = raceKey.trim()
  if (knownRaceKeys.includes(trimmed)) {
    return trimmed
  }
  return COMPANION_FALLBACK_RACE_KEY
}

function filterInventoryIds(
  ids: string[] | null | undefined,
  knownInventoryItemIds: readonly string[]
): string[] {
  if (!Array.isArray(ids)) {
    return []
  }
  const known = new Set(knownInventoryItemIds)
  const out: string[] = []
  for (const id of ids) {
    if (typeof id === 'string' && known.has(id) && !out.includes(id)) {
      out.push(id)
    }
  }
  return out
}

function buildPcContextDigest(pc: CompanionGeneratePcContext): string {
  const race = pc.raceKey?.trim() || 'unknown-race'
  const background = pc.backgroundKey?.trim() || 'no-background'
  return `${pc.name} · ${race} · ${background} · ${pc.archetype}`
}

/**
 * Engine clamp for companion generate previews.
 * Returns null when the proposal cannot yield a usable companion (e.g. blank name).
 */
export function clampCompanionProposal(
  proposal: CompanionAgentProposal,
  pc: CompanionGeneratePcContext,
  catalog: CompanionClampCatalog
): CompanionPreviewDto | null {
  const name = proposal.name.trim()
  if (name.length === 0) {
    return null
  }
  const characterClass = trimToMax(proposal.characterClass || 'adventurer', 80)
  const personality = trimToMax(proposal.personality || 'Loyal companion.', COMPANION_PERSONALITY_MAX_CHARS)
  const role = trimToMax(proposal.role?.trim() || characterClass, 80)
  return {
    name: trimToMax(name, 80),
    characterClass,
    personality,
    raceKey: resolveRaceKey(proposal.raceKey, catalog.knownRaceKeys),
    role,
    appearance: normalizeAppearance(proposal.appearance),
    inventoryItemIds: filterInventoryIds(proposal.inventoryItemIds, catalog.knownInventoryItemIds),
    ownerPlayerCharacterId: pc.playerCharacterId,
    pcContextDigest: buildPcContextDigest(pc)
  }
}

export function companionIdentityDigestFromPreview(
  preview: CompanionPreviewDto
): CompanionIdentityDigest {
  return {
    name: preview.name,
    role: preview.role,
    raceKey: preview.raceKey,
    characterClass: preview.characterClass
  }
}

export function companionIdentityDigestFromMember(
  source: CompanionIdentityDigestSource
): CompanionIdentityDigest {
  const stats = source.stats as Record<string, unknown>
  const storedRole = stats['companionRole']
  const role =
    typeof storedRole === 'string' && storedRole.trim().length > 0
      ? storedRole.trim()
      : source.characterClass
  return {
    name: source.name,
    role,
    raceKey: source.raceKey?.trim() || COMPANION_FALLBACK_RACE_KEY,
    characterClass: source.characterClass
  }
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

export function isCompanionAppearanceTraits(value: unknown): value is CompanionAppearanceTraits {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    isNullableString(row['hairColor']) &&
    isNullableString(row['age']) &&
    isNullableString(row['eyeColor'])
  )
}

export function isCompanionPreviewDto(value: unknown): value is CompanionPreviewDto {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  if (!hasValidPreviewScalars(row)) {
    return false
  }
  if (!isCompanionAppearanceTraits(row['appearance'])) {
    return false
  }
  if (!Array.isArray(row['inventoryItemIds']) || !row['inventoryItemIds'].every((id) => typeof id === 'string')) {
    return false
  }
  return true
}

function hasValidPreviewScalars(row: Record<string, unknown>): boolean {
  return (
    typeof row['name'] === 'string' &&
    typeof row['characterClass'] === 'string' &&
    typeof row['personality'] === 'string' &&
    typeof row['raceKey'] === 'string' &&
    typeof row['role'] === 'string' &&
    typeof row['ownerPlayerCharacterId'] === 'string' &&
    typeof row['pcContextDigest'] === 'string'
  )
}

export function parseCompanionPreviewDto(value: unknown): CompanionPreviewDto | undefined {
  return isCompanionPreviewDto(value) ? value : undefined
}

export function isCompanionsGuidedPhase(value: unknown): value is CompanionsGuidedPhase {
  return value === COMPANIONS_GUIDED_PHASE
}

/** Slim play-roster row for owned companions (129.9). */
export interface CompanionRosterEntry {
  id: string
  name: string
  characterClass: string
  role: string
  portraitPath: string | null
  orderText: string | null
}

export interface CompanionRosterSource {
  id: string
  name: string
  characterClass: string
  portraitPath: string | null
  stats: unknown
}

export function companionRosterEntryFromMember(source: CompanionRosterSource): CompanionRosterEntry {
  const stats = source.stats as Record<string, unknown>
  const storedRole = stats['companionRole']
  const role =
    typeof storedRole === 'string' && storedRole.trim().length > 0
      ? storedRole.trim()
      : source.characterClass
  const order = readCompanionOrderFromStats(stats)
  return {
    id: source.id,
    name: source.name,
    characterClass: source.characterClass,
    role,
    portraitPath: source.portraitPath,
    orderText: order?.text ?? null
  }
}
