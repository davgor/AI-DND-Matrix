/** Campaign package file extension (single-file SQLite package). */
export const CAMPAIGN_PACKAGE_EXTENSION = '.aittrpg' as const

/** Manifest magic string stored in `portable_meta.magic`. */
export const CAMPAIGN_PACKAGE_MAGIC = 'ai-ttrpg-campaign-package' as const

/** Package format version (independent of SQLite `user_version`). */
export const CAMPAIGN_PACKAGE_FORMAT_VERSION = 1 as const

/** Filename stem helper prefix for save dialogs. */
export const CAMPAIGN_PACKAGE_FILENAME_PREFIX = 'campaign' as const

export const PORTABLE_DEFAULT_OPTIONS = {
  includeLlmUsage: false,
  includeRagChunks: false
} as const

export type PortableExportOptions = {
  includeLlmUsage: boolean
  includeRagChunks: boolean
}

/**
 * Campaign-scoped tables always copied into a package (plus referenced `items` rows).
 * Mirrors delete-cascade ownership from epic 019, plus nested modification rows.
 */
export const PORTABLE_TABLES_ALWAYS = [
  'campaigns',
  'regions',
  'region_history',
  'npcs',
  'npc_memories',
  'characters',
  'character_items',
  'character_item_modifications',
  'character_quests',
  'character_journal_entries',
  'character_faction_reputations',
  'guided_creation_messages',
  'ask_dm_messages',
  'log_entries',
  'saves',
  'world_facts',
  'story_threads',
  'events',
  'sessions',
  'combat_encounters',
  'campaign_races',
  'deities',
  'factions',
  'faction_relations',
  'bestiary_species',
  'bestiary_variants',
  'quests',
  'quest_foe_assignments'
] as const

export type PortableAlwaysTable = (typeof PORTABLE_TABLES_ALWAYS)[number]

/** Optional tables — omitted unless the matching export option is true. */
export const PORTABLE_TABLES_OPTIONAL_EXCLUDE = [
  'llm_usage_events',
  'rag_chunks',
  'rag_backfill_state'
] as const

export type PortableOptionalTable = (typeof PORTABLE_TABLES_OPTIONAL_EXCLUDE)[number]

export const PORTABLE_ASSET_KINDS = ['portrait', 'sheet_background', 'npc_face_token'] as const

export type PortableAssetKind = (typeof PORTABLE_ASSET_KINDS)[number]

export type CampaignPortabilityFailureCode =
  | 'not_found'
  | 'invalid_package'
  | 'unsupported_version'
  | 'corrupt_package'
  | 'io_error'
  | 'import_failed'
  | 'export_failed'
  | 'duplicate_failed'

export interface CampaignPortabilitySuccess {
  ok: true
  /** New or exported campaign id (import/duplicate → new id; export → source id). */
  campaignId: string
  /** Absolute path written (export only); absent for in-app duplicate. */
  path?: string
}

export interface CampaignPortabilityFailure {
  ok: false
  code: CampaignPortabilityFailureCode
  message: string
}

export interface CampaignPortabilityCanceled {
  ok: false
  canceled: true
}

export type CampaignExportResult =
  | (CampaignPortabilitySuccess & { path: string })
  | CampaignPortabilityFailure
  | CampaignPortabilityCanceled

export type CampaignImportResult =
  | CampaignPortabilitySuccess
  | CampaignPortabilityFailure
  | CampaignPortabilityCanceled

export type CampaignDuplicateResult = CampaignPortabilitySuccess | CampaignPortabilityFailure

export function isCampaignPackageSuccess(
  result: CampaignExportResult | CampaignImportResult | CampaignDuplicateResult
): result is CampaignPortabilitySuccess {
  return result.ok === true
}

export function isCampaignPackageFailure(
  result: CampaignExportResult | CampaignImportResult | CampaignDuplicateResult
): result is CampaignPortabilityFailure | CampaignPortabilityCanceled {
  return result.ok === false
}

/** Rows written into package-only `portable_meta` (single row). */
export interface PortableMetaRow {
  magic: typeof CAMPAIGN_PACKAGE_MAGIC
  formatVersion: typeof CAMPAIGN_PACKAGE_FORMAT_VERSION
  /** SQLite `user_version` of the exporting app when the package was built. */
  schemaUserVersion: number
  sourceCampaignId: string
  exportedAt: string
  includeLlmUsage: boolean
  includeRagChunks: boolean
  appVersion: string
}

/** Rows written into package-only `portable_assets`. */
export interface PortableAssetRow {
  id: string
  kind: PortableAssetKind
  /** Logical path key used to rewrite DB path columns on import (e.g. `portraits/{uuid}.png`). */
  logicalPath: string
  /** Owning entity id in the *source* campaign (character id or npc id). */
  ownerEntityId: string
  mimeType: string
  bytes: Uint8Array
}
