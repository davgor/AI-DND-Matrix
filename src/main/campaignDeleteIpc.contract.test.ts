import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import {
  buildRealisticLlmCascadingSeedResponses,
  npcReviewResponses,
  RACE_LORE_RESPONSE
} from '../agents/campaignGeneration/fixtures'
import { getCampaignById } from '../db/repositories/campaigns'
import { listCampaignRaces } from '../db/repositories/campaignRaces'
import { createCampaignFromRequest, resetCampaignCreateForTests } from './campaignCreateIpc'
import { deleteCampaignById } from './campaignDeleteIpc'

const DEFAULT_CREATE_REQUEST = {
  sessionId: 'contract-delete-after-create',
  name: 'Gilded Crown',
  premisePrompt:
    'Winter closes in on a desert caravan city while a missing envoy never returned from the uplands.',
  deathMode: 'standard' as const,
  regionCount: 2,
  npcsPerRegion: 3
}

const CAMPAIGN_SCOPED_TABLES = [
  'regions',
  'npcs',
  'characters',
  'saves',
  'world_facts',
  'story_threads',
  'events',
  'sessions',
  'log_entries',
  'guided_creation_messages',
  'character_journal_entries',
  'combat_encounters',
  'quests',
  'campaign_races'
] as const

function countCampaignRows(db: ReturnType<typeof createTestDb>, table: string, campaignId: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM ${table} WHERE campaign_id = ?`)
    .get(campaignId) as { count: number }
  return row.count
}

function providerForDefaultForm(): ReturnType<typeof createScriptedProvider> {
  return createScriptedProvider(buildCreateResponses())
}

function buildCreateResponses(): string[] {
  return [
    ...buildRealisticLlmCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 3 }),
    RACE_LORE_RESPONSE,
    ...npcReviewResponses(6)
  ]
}

function providerForTwoCreates(): ReturnType<typeof createScriptedProvider> {
  const one = buildCreateResponses()
  return createScriptedProvider([...one, ...one])
}

describe('deleteCampaignById contract — post-create footprint', () => {
  it('deletes a freshly created campaign with races, regions, NPCs, and quests', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    db.pragma('foreign_keys = ON')

    const createResult = await createCampaignFromRequest(db, providerForDefaultForm(), DEFAULT_CREATE_REQUEST)
    expect(createResult.ok).toBe(true)
    if (!createResult.ok) {
      return
    }

    const campaignId = createResult.detail.campaign!.id
    expect(getCampaignById(db, campaignId)?.name).toBe('Gilded Crown')
    expect(createResult.detail.regions.length).toBeGreaterThan(0)
    expect(createResult.detail.npcs.length).toBeGreaterThan(0)
    expect(listCampaignRaces(db, campaignId).length).toBeGreaterThan(0)

    const unlink = vi.fn()
    const deleteResult = await deleteCampaignById(db, campaignId, unlink)

    expect(deleteResult).toEqual({ ok: true })
    expect(getCampaignById(db, campaignId)).toBeUndefined()
    for (const table of CAMPAIGN_SCOPED_TABLES) {
      expect(countCampaignRows(db, table, campaignId)).toBe(0)
    }
  })

  it('leaves other campaigns untouched after deleting one', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    db.pragma('foreign_keys = ON')

    const provider = providerForTwoCreates()
    const survivor = await createCampaignFromRequest(db, provider, {
      ...DEFAULT_CREATE_REQUEST,
      sessionId: 'contract-delete-survivor',
      name: 'Survivor Saga'
    })
    const doomed = await createCampaignFromRequest(db, provider, {
      ...DEFAULT_CREATE_REQUEST,
      sessionId: 'contract-delete-doomed',
      name: 'Doomed Tale'
    })
    expect(survivor.ok && doomed.ok).toBe(true)
    if (!survivor.ok || !doomed.ok) {
      return
    }

    const deleteResult = await deleteCampaignById(db, doomed.detail.campaign!.id, vi.fn())
    expect(deleteResult).toEqual({ ok: true })
    expect(getCampaignById(db, doomed.detail.campaign!.id)).toBeUndefined()
    expect(getCampaignById(db, survivor.detail.campaign!.id)?.name).toBe('Survivor Saga')
    expect(countCampaignRows(db, 'campaign_races', survivor.detail.campaign!.id)).toBeGreaterThan(0)
  })
})
