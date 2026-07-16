import { afterEach, describe, expect, it } from 'vitest'
import { isRewardNarrationEnrichmentEnabled } from './rewardEnrichment'

const originalValue = process.env['ENRICH_REWARD_NARRATION']

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env['ENRICH_REWARD_NARRATION']
  } else {
    process.env['ENRICH_REWARD_NARRATION'] = originalValue
  }
})

describe('isRewardNarrationEnrichmentEnabled', () => {
  it('is disabled by default (env var unset)', () => {
    delete process.env['ENRICH_REWARD_NARRATION']
    expect(isRewardNarrationEnrichmentEnabled()).toBe(false)
  })

  it('is enabled only for the exact string "true"', () => {
    process.env['ENRICH_REWARD_NARRATION'] = 'true'
    expect(isRewardNarrationEnrichmentEnabled()).toBe(true)
  })

  it('treats any other value as disabled', () => {
    process.env['ENRICH_REWARD_NARRATION'] = '1'
    expect(isRewardNarrationEnrichmentEnabled()).toBe(false)
    process.env['ENRICH_REWARD_NARRATION'] = 'false'
    expect(isRewardNarrationEnrichmentEnabled()).toBe(false)
  })
})
