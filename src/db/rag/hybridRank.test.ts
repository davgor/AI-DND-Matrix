import { describe, expect, it } from 'vitest'
import {
  RAG_CHUNK_INJECTION_CAP,
  hybridRankScore,
  selectHybridRankedChunks,
  type HybridRankCandidate
} from './hybridRank'

function candidate(
  overrides: Partial<HybridRankCandidate> & Pick<HybridRankCandidate, 'sourceId'>
): HybridRankCandidate {
  return {
    sourceTable: 'world_facts',
    text: `text-${overrides.sourceId}`,
    semanticScore: 0.5,
    ...overrides
  }
}

describe('hybridRankScore semantic-only', () => {
  it('ranks higher semantic score above lower when tag and recency are absent', () => {
    const high = candidate({ sourceId: 'high', semanticScore: 0.9 })
    const low = candidate({ sourceId: 'low', semanticScore: 0.2 })

    expect(hybridRankScore(high)).toBeGreaterThan(hybridRankScore(low))
    expect(hybridRankScore(high)).toBeCloseTo(0.9 * 0.7, 5)
    expect(hybridRankScore(low)).toBeCloseTo(0.2 * 0.7, 5)
  })
})

describe('hybridRankScore tag-only', () => {
  it('boosts a tag-matched candidate over an equal-semantic untagged one', () => {
    const tagged = candidate({ sourceId: 'tagged', semanticScore: 0.5, tagMatch: true })
    const untagged = candidate({ sourceId: 'untagged', semanticScore: 0.5, tagMatch: false })

    expect(hybridRankScore(tagged)).toBeGreaterThan(hybridRankScore(untagged))
    expect(hybridRankScore(tagged)).toBeCloseTo(0.5 * 0.7 + 0.2, 5)
    expect(hybridRankScore(untagged)).toBeCloseTo(0.5 * 0.7, 5)
  })

  it('can promote a weaker semantic hit when tag match compensates', () => {
    const tagged = candidate({ sourceId: 'tagged', semanticScore: 0.8, tagMatch: true })
    const untagged = candidate({ sourceId: 'untagged', semanticScore: 0.95, tagMatch: false })

    expect(hybridRankScore(tagged)).toBeGreaterThan(hybridRankScore(untagged))
  })
})

describe('hybridRankScore recency-only', () => {
  it('ranks fresher rows above stale ones at equal semantic and tag', () => {
    const fresh = candidate({ sourceId: 'fresh', semanticScore: 0.5, recencyScore: 1 })
    const stale = candidate({ sourceId: 'stale', semanticScore: 0.5, recencyScore: 0.1 })

    expect(hybridRankScore(fresh)).toBeGreaterThan(hybridRankScore(stale))
    expect(hybridRankScore(fresh)).toBeCloseTo(0.5 * 0.7 + 0.1, 5)
    expect(hybridRankScore(stale)).toBeCloseTo(0.5 * 0.7 + 0.01, 5)
  })
})

describe('selectHybridRankedChunks', () => {
  it('sorts by hybrid score descending', () => {
    const selected = selectHybridRankedChunks([
      candidate({ sourceId: 'low', semanticScore: 0.1 }),
      candidate({ sourceId: 'high', semanticScore: 0.9 }),
      candidate({ sourceId: 'mid', semanticScore: 0.5 })
    ])

    expect(selected.map((row) => row.sourceId)).toEqual(['high', 'mid', 'low'])
  })

  it('hard-caps an oversized candidate set to RAG_CHUNK_INJECTION_CAP', () => {
    const oversized = Array.from({ length: 40 }, (_, index) =>
      candidate({ sourceId: `chunk-${index}`, semanticScore: index / 40 })
    )

    const selected = selectHybridRankedChunks(oversized)

    expect(selected).toHaveLength(RAG_CHUNK_INJECTION_CAP)
    expect(RAG_CHUNK_INJECTION_CAP).toBe(12)
  })

  it('respects an explicit cap override', () => {
    const oversized = Array.from({ length: 20 }, (_, index) =>
      candidate({ sourceId: `chunk-${index}`, semanticScore: index / 20 })
    )

    expect(selectHybridRankedChunks(oversized, 5)).toHaveLength(5)
  })
})
