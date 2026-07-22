/** Stable purpose ids for LLM metering (epic 112). Extend carefully. */
export const LLM_PURPOSE_IDS = [
  'campaign.pantheon',
  'campaign.world',
  'campaign.faction',
  'campaign.region',
  'campaign.npc',
  'campaign.story',
  'onboarding.race_lore',
  'onboarding.background',
  'onboarding.guided_identity',
  'onboarding.companion_generate',
  'onboarding.opening_scene',
  'play.intent_route',
  'play.narration',
  'play.npc_reaction',
  'play.party_member',
  'play.inactive_proxy',
  'play.combat',
  'play.loot_xp',
  'play.recap',
  'play.ooc_dm',
  'system.ping',
  'other.unclassified'
] as const

export type LlmPurposeId = (typeof LLM_PURPOSE_IDS)[number]

export type LlmPurposeBucket = 'setup' | 'play' | 'meta'

export const LLM_PURPOSE_BUCKETS: Record<LlmPurposeId, LlmPurposeBucket> = {
  'campaign.pantheon': 'setup',
  'campaign.world': 'setup',
  'campaign.faction': 'setup',
  'campaign.region': 'setup',
  'campaign.npc': 'setup',
  'campaign.story': 'setup',
  'onboarding.race_lore': 'setup',
  'onboarding.background': 'setup',
  'onboarding.guided_identity': 'setup',
  'onboarding.companion_generate': 'setup',
  'onboarding.opening_scene': 'setup',
  'play.intent_route': 'play',
  'play.narration': 'play',
  'play.npc_reaction': 'play',
  'play.party_member': 'play',
  'play.inactive_proxy': 'play',
  'play.combat': 'play',
  'play.loot_xp': 'play',
  'play.recap': 'play',
  'play.ooc_dm': 'play',
  'system.ping': 'meta',
  'other.unclassified': 'meta'
}

export type LlmUsageOutcome = 'success' | 'error'

/** Token snapshot returned by a provider adapter (may be partially null). */
export interface ProviderUsageSnapshot {
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  modelId?: string
}

/** Durable usage row shape (DB / export). */
export interface LlmUsageEvent {
  id: string
  providerName: string
  modelId: string
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  purpose: LlmPurposeId
  bucket: LlmPurposeBucket
  campaignId: string | null
  characterId: string | null
  createdAt: string
  outcome: LlmUsageOutcome
  errorMessage: string | null
}

export function isLlmPurposeId(value: unknown): value is LlmPurposeId {
  return typeof value === 'string' && (LLM_PURPOSE_IDS as readonly string[]).includes(value)
}

export function bucketForPurpose(purpose: LlmPurposeId): LlmPurposeBucket {
  return LLM_PURPOSE_BUCKETS[purpose]
}

export function resolvePurpose(purpose: LlmPurposeId | undefined): LlmPurposeId {
  if (purpose !== undefined && isLlmPurposeId(purpose)) {
    return purpose
  }
  return 'other.unclassified'
}

/** Dev-only warning when a call omitted purpose (production should always pass one). */
export function warnIfUnclassifiedPurpose(
  purpose: LlmPurposeId | undefined,
  warn: (message: string) => void = console.warn
): LlmPurposeId {
  const resolved = resolvePurpose(purpose)
  if (purpose === undefined || purpose === 'other.unclassified') {
    warn('[llmUsage] generate called without a classified purpose; using other.unclassified')
  }
  return resolved
}

export function sumUsageSnapshots(
  a: ProviderUsageSnapshot | null | undefined,
  b: ProviderUsageSnapshot | null | undefined
): ProviderUsageSnapshot | null {
  if (!a && !b) {
    return null
  }
  const left = a ?? emptyUsageSnapshot()
  const right = b ?? emptyUsageSnapshot()
  return {
    inputTokens: addNullable(left.inputTokens, right.inputTokens),
    outputTokens: addNullable(left.outputTokens, right.outputTokens),
    totalTokens: addNullable(left.totalTokens, right.totalTokens),
    modelId: right.modelId ?? left.modelId
  }
}

export function emptyUsageSnapshot(modelId?: string): ProviderUsageSnapshot {
  return { inputTokens: null, outputTokens: null, totalTokens: null, modelId }
}

function addNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) {
    return null
  }
  return (a ?? 0) + (b ?? 0)
}
