import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_PACKAGE_EXTENSION,
  CAMPAIGN_PACKAGE_FORMAT_VERSION,
  CAMPAIGN_PACKAGE_MAGIC,
  PORTABLE_ASSET_KINDS,
  PORTABLE_DEFAULT_OPTIONS,
  PORTABLE_TABLES_ALWAYS,
  PORTABLE_TABLES_OPTIONAL_EXCLUDE,
  isCampaignPackageFailure,
  isCampaignPackageSuccess
} from './types'

describe('campaign portability package contract', () => {
  it('locks the single-file SQLite package identity', () => {
    expect(CAMPAIGN_PACKAGE_EXTENSION).toBe('.aittrpg')
    expect(CAMPAIGN_PACKAGE_MAGIC).toBe('ai-ttrpg-campaign-package')
    expect(CAMPAIGN_PACKAGE_FORMAT_VERSION).toBe(1)
  })

  it('defaults to excluding usage events and RAG embeddings', () => {
    expect(PORTABLE_DEFAULT_OPTIONS).toEqual({
      includeLlmUsage: false,
      includeRagChunks: false
    })
  })

  it('lists campaign-scoped tables that always travel with the package', () => {
    expect(PORTABLE_TABLES_ALWAYS).toContain('campaigns')
    expect(PORTABLE_TABLES_ALWAYS).toContain('characters')
    expect(PORTABLE_TABLES_ALWAYS).toContain('character_item_modifications')
    expect(PORTABLE_TABLES_ALWAYS).toContain('factions')
    expect(PORTABLE_TABLES_ALWAYS).toContain('faction_relations')
    expect(PORTABLE_TABLES_ALWAYS).toContain('character_faction_reputations')
    expect(PORTABLE_TABLES_ALWAYS).not.toContain('llm_usage_events')
    expect(PORTABLE_TABLES_ALWAYS).not.toContain('rag_chunks')
    expect(PORTABLE_TABLES_ALWAYS).not.toContain('catalog_creatures')
  })

  it('names optional tables that default to excluded', () => {
    expect(PORTABLE_TABLES_OPTIONAL_EXCLUDE).toEqual(['llm_usage_events', 'rag_chunks', 'rag_backfill_state'])
  })

  it('includes portrait, sheet-background, and face-token asset kinds', () => {
    expect(PORTABLE_ASSET_KINDS).toEqual(['portrait', 'sheet_background', 'npc_face_token'])
  })

  it('narrows success vs failure result unions', () => {
    expect(isCampaignPackageSuccess({ ok: true, campaignId: 'c1', path: '/tmp/a.aittrpg' })).toBe(true)
    expect(isCampaignPackageFailure({ ok: false, code: 'not_found', message: 'missing' })).toBe(true)
    expect(isCampaignPackageFailure({ ok: false, canceled: true })).toBe(true)
  })
})
