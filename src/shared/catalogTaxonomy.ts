/**
 * Versioned taxonomy spec for the preseeded content catalog (creatures, spells/abilities).
 * Bump TAXONOMY_VERSION whenever BUCKETS changes; seeding and retrieval logic read
 * this file directly so there is a single source of truth for valid buckets.
 *
 * Multi-bucket tagging rules:
 * - An entry may carry 1 to MAX_BUCKETS_PER_ENTRY buckets (inclusive).
 * - Buckets on a single entry must be unique (no duplicates).
 * - Every bucket on an entry must be a member of BUCKETS.
 *
 * Extension rules for adding a new bucket later:
 * - Append the new bucket to BUCKETS (never remove or rename an existing bucket key,
 *   since seeded data and saved catalog rows reference bucket keys directly).
 * - Bump TAXONOMY_VERSION.
 * - Existing entries are unaffected; they simply don't carry the new bucket until curated.
 */
export const TAXONOMY_VERSION = 1

export const BUCKETS = [
  'goblinoid',
  'humanoid',
  'dragonkin',
  'undead',
  'fiend',
  'beast',
  'elemental',
  'construct'
] as const

export type Bucket = (typeof BUCKETS)[number]

export const MAX_BUCKETS_PER_ENTRY = 3

export function isBucket(value: string): value is Bucket {
  return (BUCKETS as readonly string[]).includes(value)
}

export interface BucketSetValidation {
  valid: boolean
  reason?: string
}

export function validateBucketSet(buckets: string[]): BucketSetValidation {
  if (buckets.length === 0) {
    return { valid: false, reason: 'at least one bucket is required' }
  }
  if (buckets.length > MAX_BUCKETS_PER_ENTRY) {
    return { valid: false, reason: `at most ${MAX_BUCKETS_PER_ENTRY} buckets are allowed per entry` }
  }
  const unknown = buckets.find((bucket) => !isBucket(bucket))
  if (unknown !== undefined) {
    return { valid: false, reason: `unknown bucket: ${unknown}` }
  }
  const unique = new Set(buckets)
  if (unique.size !== buckets.length) {
    return { valid: false, reason: 'buckets must not contain duplicates' }
  }
  return { valid: true }
}
