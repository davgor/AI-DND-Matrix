import { describe, expect, it, vi } from 'vitest'
import {
  LLM_PURPOSE_BUCKETS,
  LLM_PURPOSE_IDS,
  bucketForPurpose,
  emptyUsageSnapshot,
  isLlmPurposeId,
  resolvePurpose,
  sumUsageSnapshots,
  warnIfUnclassifiedPurpose
} from './types'

describe('LLM purpose taxonomy: ids', () => {
  it('locks the purpose id set (112 + 129 companion generate)', () => {
    expect([...LLM_PURPOSE_IDS]).toEqual([
      'campaign.pantheon',
      'campaign.world',
      'campaign.faction',
      'campaign.region',
      'campaign.npc',
      'campaign.story',
      'onboarding.race_lore',
      'onboarding.background',
      'onboarding.guided_identity',
      'onboarding.companion_generate',
      'onboarding.opening_scene',
      'play.intent_route',
      'play.narration',
      'play.npc_reaction',
      'play.party_member',
      'play.inactive_proxy',
      'play.combat',
      'play.loot_xp',
      'play.recap',
      'play.ooc_dm',
      'system.ping',
      'other.unclassified'
    ])
  })
})

describe('LLM purpose taxonomy: buckets', () => {
  it('maps every purpose to a setup | play | meta bucket', () => {
    for (const purpose of LLM_PURPOSE_IDS) {
      expect(['setup', 'play', 'meta']).toContain(LLM_PURPOSE_BUCKETS[purpose])
      expect(bucketForPurpose(purpose)).toBe(LLM_PURPOSE_BUCKETS[purpose])
    }
  })

  it('puts campaign/onboarding in setup, play.* in play, meta for ping/unclassified', () => {
    expect(bucketForPurpose('campaign.world')).toBe('setup')
    expect(bucketForPurpose('onboarding.companion_generate')).toBe('setup')
    expect(bucketForPurpose('onboarding.opening_scene')).toBe('setup')
    expect(bucketForPurpose('play.npc_reaction')).toBe('play')
    expect(bucketForPurpose('system.ping')).toBe('meta')
    expect(bucketForPurpose('other.unclassified')).toBe('meta')
  })
})

describe('LLM purpose taxonomy: validation', () => {
  it('isLlmPurposeId accepts only taxonomy members', () => {
    expect(isLlmPurposeId('play.narration')).toBe(true)
    expect(isLlmPurposeId('play.unknown')).toBe(false)
    expect(isLlmPurposeId(null)).toBe(false)
  })

  it('resolvePurpose falls back to other.unclassified', () => {
    expect(resolvePurpose('play.recap')).toBe('play.recap')
    expect(resolvePurpose(undefined)).toBe('other.unclassified')
  })

  it('warnIfUnclassifiedPurpose warns in the testable path', () => {
    const warn = vi.fn()
    expect(warnIfUnclassifiedPurpose(undefined, warn)).toBe('other.unclassified')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain('other.unclassified')

    warn.mockClear()
    expect(warnIfUnclassifiedPurpose('play.combat', warn)).toBe('play.combat')
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('usage snapshot helpers (112.1)', () => {
  it('sumUsageSnapshots aggregates tokens and prefers the later model id', () => {
    const sum = sumUsageSnapshots(
      { inputTokens: 10, outputTokens: 5, totalTokens: 15, modelId: 'a' },
      { inputTokens: 20, outputTokens: null, totalTokens: null, modelId: 'b' }
    )
    expect(sum).toEqual({
      inputTokens: 30,
      outputTokens: 5,
      totalTokens: 15,
      modelId: 'b'
    })
  })

  it('sumUsageSnapshots returns null when both sides are empty', () => {
    expect(sumUsageSnapshots(null, undefined)).toBeNull()
    expect(emptyUsageSnapshot('m')).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      modelId: 'm'
    })
  })
})
