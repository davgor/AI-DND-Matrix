import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import {
  createRegionHistoryEntry,
  listRegionHistoryByRegion
} from '../db/repositories/regionHistory'
import { createScriptedProvider } from './providers/mockHarness'
import { compressRegionHistory } from './regionHistoryCompression'

function seedRegion(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  return createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: '...' })
}

function seedCandidatesAndRecent(db: ReturnType<typeof createTestDb>, regionId: string) {
  const first = createRegionHistoryEntry(db, { regionId, inGameDate: 1, content: 'First old event' })
  const second = createRegionHistoryEntry(db, { regionId, inGameDate: 2, content: 'Second old event' })
  const third = createRegionHistoryEntry(db, { regionId, inGameDate: 3, content: 'Third old event' })
  const recent = createRegionHistoryEntry(db, { regionId, inGameDate: 50, content: 'Recent event' })
  return { first, second, third, recent }
}

describe('compressRegionHistory', () => {
  it('calls the provider with the candidate content and returns the compressed entry', async () => {
    const db = createTestDb()
    const region = seedRegion(db)
    seedCandidatesAndRecent(db, region.id)

    const provider = createScriptedProvider(['A condensed summary of three old events.'])
    const result = await compressRegionHistory(db, provider, region.id, 10)

    expect(provider.calls).toHaveLength(1)
    expect(provider.calls[0]?.prompt).toContain('First old event')
    expect(provider.calls[0]?.prompt).toContain('Second old event')
    expect(provider.calls[0]?.prompt).toContain('Third old event')
    expect(provider.calls[0]?.context?.maxTokens).toBe(256)
    expect(result?.isCompressed).toBe(true)
    expect(result?.content).toBe('A condensed summary of three old events.')
  })

  it('replaces only the old candidates, leaving the recent entry untouched', async () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const { first, second, third, recent } = seedCandidatesAndRecent(db, region.id)

    const provider = createScriptedProvider(['A condensed summary of three old events.'])
    await compressRegionHistory(db, provider, region.id, 10)

    const remaining = listRegionHistoryByRegion(db, region.id)
    expect(remaining).toHaveLength(2)

    const remainingIds = remaining.map((entry) => entry.id)
    expect(remainingIds).not.toContain(first.id)
    expect(remainingIds).not.toContain(second.id)
    expect(remainingIds).not.toContain(third.id)
    expect(remainingIds).toContain(recent.id)

    const untouchedEntry = remaining.find((entry) => entry.id === recent.id)
    expect(untouchedEntry?.isCompressed).toBe(false)
    expect(untouchedEntry?.content).toBe('Recent event')
  })

  it('returns null and never calls the provider when there are no compression candidates', async () => {
    const db = createTestDb()
    const region = seedRegion(db)

    createRegionHistoryEntry(db, {
      regionId: region.id,
      inGameDate: 50,
      content: 'Recent event'
    })

    const provider = createScriptedProvider(['unused summary'])

    const result = await compressRegionHistory(db, provider, region.id, 10)

    expect(result).toBeNull()
    expect(provider.calls).toHaveLength(0)
  })
})
