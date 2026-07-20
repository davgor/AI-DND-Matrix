import { describe, expect, it } from 'vitest'
import { estimateFileMs, planTestShards } from './testShardPlan.mjs'

describe('estimateFileMs', () => {
  it('uses known timing when present', () => {
    expect(estimateFileMs('a.test.ts', { 'a.test.ts': 1200 }, 500)).toBe(1200)
  })

  it('uses median of known timings when missing', () => {
    const timings = { a: 100, b: 300, c: 500 }
    expect(estimateFileMs('missing.test.ts', timings, 500)).toBe(300)
  })

  it('falls back when timings map is empty', () => {
    expect(estimateFileMs('missing.test.ts', {}, 500)).toBe(500)
  })
})

describe('planTestShards', () => {
  it('returns one empty shard for empty file list', () => {
    expect(planTestShards({ files: [], timings: {}, targetMs: 60_000 })).toEqual({
      shardCount: 1,
      shards: [[]],
      estimatesMs: [0]
    })
  })

  it('uses one shard when total estimate is under target', () => {
    const plan = planTestShards({
      files: ['a.test.ts', 'b.test.ts'],
      timings: { 'a.test.ts': 10_000, 'b.test.ts': 20_000 },
      targetMs: 60_000
    })
    expect(plan.shardCount).toBe(1)
    expect(plan.shards).toHaveLength(1)
    expect(plan.shards[0].sort()).toEqual(['a.test.ts', 'b.test.ts'])
    expect(plan.estimatesMs[0]).toBe(30_000)
  })

  it('sets shardCount from ceil(total / targetMs)', () => {
    const plan = planTestShards({
      files: ['a.test.ts', 'b.test.ts', 'c.test.ts', 'd.test.ts'],
      timings: {
        'a.test.ts': 40_000,
        'b.test.ts': 40_000,
        'c.test.ts': 40_000,
        'd.test.ts': 40_000
      },
      targetMs: 60_000
    })
    expect(plan.shardCount).toBe(3)
    expect(plan.shards).toHaveLength(3)
  })

  it('balances heavy files onto different shards', () => {
    const plan = planTestShards({
      files: ['heavy-a.test.ts', 'heavy-b.test.ts', 'light.test.ts'],
      timings: {
        'heavy-a.test.ts': 50_000,
        'heavy-b.test.ts': 50_000,
        'light.test.ts': 1_000
      },
      targetMs: 60_000
    })
    expect(plan.shardCount).toBe(2)
    const heavyShards = plan.shards.map((shard) =>
      shard.filter((f) => f.startsWith('heavy-')).length
    )
    expect(heavyShards.every((count) => count === 1)).toBe(true)
  })

  it('is deterministic for the same inputs', () => {
    const input = {
      files: ['c.test.ts', 'a.test.ts', 'b.test.ts'],
      timings: { 'a.test.ts': 10_000, 'b.test.ts': 10_000, 'c.test.ts': 10_000 },
      targetMs: 15_000
    }
    expect(planTestShards(input)).toEqual(planTestShards(input))
  })

  it('balances equal weights across shards by count', () => {
    const files = ['a.test.ts', 'b.test.ts', 'c.test.ts', 'd.test.ts']
    const timings = Object.fromEntries(files.map((f) => [f, 30_000]))
    const plan = planTestShards({ files, timings, targetMs: 60_000 })
    expect(plan.shardCount).toBe(2)
    expect(plan.shards.map((s) => s.length).sort()).toEqual([2, 2])
  })
})
