import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createRegion } from './regions'
import {
  createRegionHistoryEntry,
  listCompressionCandidates,
  listRegionHistoryByRegion,
  markRegionHistoryCompressed,
  replaceRegionHistoryWithCompressedSummary
} from './regionHistory'

function seedRegion(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  return createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: '...' })
}

describe('regionHistory repository: create + listByRegion', () => {
  it('round-trips an entry and lists it for its region', () => {
    const db = createTestDb()
    const region = seedRegion(db)

    const created = createRegionHistoryEntry(db, {
      regionId: region.id,
      inGameDate: 0,
      content: 'Founded by woodcutters fleeing the war.'
    })

    expect(created.isCompressed).toBe(false)
    expect(listRegionHistoryByRegion(db, region.id)).toEqual([created])
  })
})

describe('regionHistory repository: markCompressed', () => {
  it('replaces content and marks the entry compressed', () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const created = createRegionHistoryEntry(db, {
      regionId: region.id,
      inGameDate: 0,
      content: 'A long detailed account of the founding.'
    })

    markRegionHistoryCompressed(db, created.id, 'The village was founded long ago.')

    const [entry] = listRegionHistoryByRegion(db, region.id)
    expect(entry?.isCompressed).toBe(true)
    expect(entry?.content).toBe('The village was founded long ago.')
  })
})

describe('regionHistory repository: listCompressionCandidates', () => {
  it('returns only uncompressed entries older than the given threshold', () => {
    const db = createTestDb()
    const region = seedRegion(db)

    const old = createRegionHistoryEntry(db, {
      regionId: region.id,
      inGameDate: 5,
      content: 'Old entry'
    })
    createRegionHistoryEntry(db, { regionId: region.id, inGameDate: 50, content: 'Recent entry' })
    const alreadyCompressed = createRegionHistoryEntry(db, {
      regionId: region.id,
      inGameDate: 2,
      content: 'Already compressed'
    })
    markRegionHistoryCompressed(db, alreadyCompressed.id, 'compressed summary')

    const candidates = listCompressionCandidates(db, region.id, 10)

    expect(candidates.map((c) => c.id)).toEqual([old.id])
  })

  it('only returns candidates for the given region', () => {
    const db = createTestDb()
    const regionA = seedRegion(db)
    const regionB = seedRegion(db)

    const candidateA = createRegionHistoryEntry(db, {
      regionId: regionA.id,
      inGameDate: 1,
      content: '...'
    })
    createRegionHistoryEntry(db, { regionId: regionB.id, inGameDate: 1, content: '...' })

    const candidates = listCompressionCandidates(db, regionA.id, 10)

    expect(candidates.map((c) => c.id)).toEqual([candidateA.id])
  })
})

describe('regionHistory repository: replaceRegionHistoryWithCompressedSummary', () => {
  it('deletes the candidate entries and inserts one compressed summary row', () => {
    const db = createTestDb()
    const region = seedRegion(db)

    const first = createRegionHistoryEntry(db, {
      regionId: region.id,
      inGameDate: 1,
      content: 'First old event'
    })
    const second = createRegionHistoryEntry(db, {
      regionId: region.id,
      inGameDate: 2,
      content: 'Second old event'
    })
    const third = createRegionHistoryEntry(db, {
      regionId: region.id,
      inGameDate: 3,
      content: 'Third old event'
    })

    const result = replaceRegionHistoryWithCompressedSummary(db, {
      regionId: region.id,
      candidateIds: [first.id, second.id, third.id],
      summary: 'A condensed summary of three events.',
      inGameDate: 3
    })

    expect(result.isCompressed).toBe(true)
    expect(result.content).toBe('A condensed summary of three events.')

    const remaining = listRegionHistoryByRegion(db, region.id)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.isCompressed).toBe(true)
    expect(remaining[0]?.content).toBe('A condensed summary of three events.')

    const remainingIds = remaining.map((entry) => entry.id)
    expect(remainingIds).not.toContain(first.id)
    expect(remainingIds).not.toContain(second.id)
    expect(remainingIds).not.toContain(third.id)
  })
})
