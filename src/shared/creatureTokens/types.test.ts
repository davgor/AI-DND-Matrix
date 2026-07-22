import { describe, expect, it } from 'vitest'
import {
  CREATURE_TOKEN_ENTITY_KIND,
  DEFAULT_ENEMY_TOKEN_GENERATION_ENABLED,
  DEFAULT_LOCAL_IMAGE_PROVIDER_ENABLED,
  shouldEnqueueCreatureToken
} from './types'

describe('creatureTokens defaults', () => {
  it('defaults enemy-token generation and local image provider to OFF', () => {
    expect(DEFAULT_ENEMY_TOKEN_GENERATION_ENABLED).toBe(false)
    expect(DEFAULT_LOCAL_IMAGE_PROVIDER_ENABLED).toBe(false)
  })

  it('uses enemy-creature entity kind for creature tokens', () => {
    expect(CREATURE_TOKEN_ENTITY_KIND).toBe('enemy_creature')
  })
})

describe('shouldEnqueueCreatureToken', () => {
  it('returns false when campaign toggle is OFF', () => {
    expect(shouldEnqueueCreatureToken(false)).toBe(false)
  })

  it('returns true only when campaign toggle is ON', () => {
    expect(shouldEnqueueCreatureToken(true)).toBe(true)
  })

  it('never enqueues when toggle is OFF even if species is eligible', () => {
    expect(shouldEnqueueCreatureToken(false, { hasCreatureToken: false })).toBe(false)
  })

  it('skips already-tokened species when toggle is ON', () => {
    expect(shouldEnqueueCreatureToken(true, { hasCreatureToken: true })).toBe(false)
    expect(shouldEnqueueCreatureToken(true, { hasCreatureToken: false })).toBe(true)
  })
})
