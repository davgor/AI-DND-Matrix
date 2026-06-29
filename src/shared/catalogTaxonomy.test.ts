import { describe, expect, it } from 'vitest'
import { BUCKETS, MAX_BUCKETS_PER_ENTRY, isBucket, validateBucketSet } from './catalogTaxonomy'

describe('catalogTaxonomy', () => {
  it('recognizes documented buckets', () => {
    expect(isBucket('goblinoid')).toBe(true)
    expect(isBucket('undead')).toBe(true)
    expect(isBucket('not-a-bucket')).toBe(false)
  })

  it('accepts a single valid bucket', () => {
    expect(validateBucketSet(['humanoid'])).toEqual({ valid: true })
  })

  it('accepts multi-bucket tagging up to the max', () => {
    expect(validateBucketSet(['dragonkin', 'fiend'])).toEqual({ valid: true })
  })

  it('rejects an empty bucket set', () => {
    expect(validateBucketSet([])).toEqual({ valid: false, reason: 'at least one bucket is required' })
  })

  it('rejects more buckets than the configured max', () => {
    const tooMany = [...BUCKETS].slice(0, MAX_BUCKETS_PER_ENTRY + 1)
    const result = validateBucketSet(tooMany)
    expect(result.valid).toBe(false)
  })

  it('rejects unknown buckets', () => {
    const result = validateBucketSet(['goblinoid', 'made-up'])
    expect(result).toEqual({ valid: false, reason: 'unknown bucket: made-up' })
  })

  it('rejects duplicate buckets on the same entry', () => {
    const result = validateBucketSet(['undead', 'undead'])
    expect(result).toEqual({ valid: false, reason: 'buckets must not contain duplicates' })
  })
})
