import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCAL_IMAGE_PROVIDER_ENABLED,
  DEFAULT_NPC_FACE_TOKEN_GENERATION_ENABLED,
  NPC_FACE_TOKEN_ENTITY_KIND,
  shouldEnqueueNpcFaceToken
} from './types'

describe('npcFaceTokens defaults', () => {
  it('defaults face-token generation and local image provider to OFF', () => {
    expect(DEFAULT_NPC_FACE_TOKEN_GENERATION_ENABLED).toBe(false)
    expect(DEFAULT_LOCAL_IMAGE_PROVIDER_ENABLED).toBe(false)
  })

  it('uses speaking-npc entity kind for face tokens', () => {
    expect(NPC_FACE_TOKEN_ENTITY_KIND).toBe('speaking_npc')
  })
})

describe('shouldEnqueueNpcFaceToken', () => {
  it('returns false when campaign toggle is OFF', () => {
    expect(shouldEnqueueNpcFaceToken(false)).toBe(false)
  })

  it('returns true only when campaign toggle is ON', () => {
    expect(shouldEnqueueNpcFaceToken(true)).toBe(true)
  })

  it('never enqueues when toggle is OFF even if NPC is eligible', () => {
    expect(
      shouldEnqueueNpcFaceToken(false, { canSpeak: true, hasFaceToken: false })
    ).toBe(false)
  })

  it('skips non-speaking or already-tokened NPCs when toggle is ON', () => {
    expect(
      shouldEnqueueNpcFaceToken(true, { canSpeak: false, hasFaceToken: false })
    ).toBe(false)
    expect(
      shouldEnqueueNpcFaceToken(true, { canSpeak: true, hasFaceToken: true })
    ).toBe(false)
    expect(
      shouldEnqueueNpcFaceToken(true, { canSpeak: true, hasFaceToken: false })
    ).toBe(true)
  })
})
