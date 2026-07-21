import { describe, expect, it } from 'vitest'
import {
  IMAGE_ERROR_CATEGORIES,
  createMockImageProvider,
  type ImageGenerateRequest
} from '../imageGeneration/types'
import { buildNpcFaceTokenPrompt } from './prompt'
import { generateNpcFaceToken } from './generate'
import { NPC_FACE_TOKEN_ENTITY_KIND } from './types'

const sampleRequest: ImageGenerateRequest = {
  entityKind: NPC_FACE_TOKEN_ENTITY_KIND,
  entityId: 'npc-1',
  campaignId: 'camp-1',
  identity: {
    name: 'Mira',
    role: 'innkeeper',
    raceKey: 'human',
    genderKey: 'female',
    age: 'middle-aged',
    hairColor: 'auburn',
    eyeColor: 'green'
  },
  styleContext: { presetId: null, notes: null }
}

describe('buildNpcFaceTokenPrompt', () => {
  it('requires head-and-shoulders framing and forbids full-body', () => {
    const prompt = buildNpcFaceTokenPrompt(sampleRequest)
    expect(prompt.toLowerCase()).toMatch(/head[\s-]and[\s-]shoulders|head\/shoulders|portrait/)
    expect(prompt.toLowerCase()).toMatch(/not full-body|no full-body|not a full-body/)
    expect(prompt).toContain('Mira')
    expect(prompt).toContain('auburn')
  })
})

describe('generateNpcFaceToken with mock provider', () => {
  it('returns success payload with image bytes on happy path', async () => {
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: 'aaa'
    })
    const result = await generateNpcFaceToken(provider, sampleRequest)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mimeType).toBe('image/png')
      expect(result.bytesBase64).toBe('aaa')
      expect(result.prompt).toContain('Mira')
    }
    expect(provider.calls).toHaveLength(1)
    expect(provider.calls[0]?.request.entityId).toBe('npc-1')
  })

  it('returns typed failure payload when provider fails', async () => {
    const provider = createMockImageProvider({
      mode: 'failure',
      category: 'provider_unavailable',
      message: 'offline'
    })
    const result = await generateNpcFaceToken(provider, sampleRequest)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('provider_unavailable')
      expect(result.message).toBe('offline')
      expect(IMAGE_ERROR_CATEGORIES).toContain(result.category)
    }
  })
})
