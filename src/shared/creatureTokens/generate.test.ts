import { describe, expect, it } from 'vitest'
import {
  IMAGE_ERROR_CATEGORIES,
  createMockImageProvider
} from '../imageGeneration/types'
import { normalizeCreatureAppearance } from './appearance'
import { buildCreatureTokenPrompt } from './prompt'
import { generateCreatureToken } from './generate'
import type { CreatureTokenGenerateRequest } from './request'
import { CREATURE_TOKEN_ENTITY_KIND } from './types'

const sampleRequest: CreatureTokenGenerateRequest = {
  speciesId: 'species-1',
  campaignId: 'camp-1',
  speciesName: 'Ashfang Wolf',
  appearance: normalizeCreatureAppearance({
    silhouette: 'quadruped wolf-like',
    sizeClass: 'medium',
    primaryColors: ['ash grey', 'ember orange'],
    distinguishingMarks: 'smoldering paw prints',
    textureOrMaterial: 'singed fur'
  }),
  loreSlice: 'Pack hunters of the burned marches.',
  styleContext: { presetId: null, notes: null }
}

describe('buildCreatureTokenPrompt', () => {
  it('requires creature-portrait framing and forbids environment or battle-map tokens', () => {
    const prompt = buildCreatureTokenPrompt(sampleRequest)
    const lower = prompt.toLowerCase()
    expect(lower).toMatch(/creature[\s-]token|creature portrait|token-suitable/)
    expect(lower).toMatch(/battle-map|grid combat token/)
    expect(lower).toMatch(/environment|landscape|scenic/)
    expect(prompt).toContain('Ashfang Wolf')
    expect(prompt).toContain('quadruped wolf-like')
    expect(prompt).toContain('singed fur')
    expect(prompt).toContain(CREATURE_TOKEN_ENTITY_KIND)
  })
})

describe('generateCreatureToken with mock provider', () => {
  it('returns success payload with image bytes on happy path', async () => {
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: 'bbb'
    })
    const result = await generateCreatureToken(provider, sampleRequest)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mimeType).toBe('image/png')
      expect(result.bytesBase64).toBe('bbb')
      expect(result.prompt).toContain('Ashfang Wolf')
    }
    expect(provider.calls).toHaveLength(1)
    expect(provider.calls[0]?.request.entityId).toBe('species-1')
    expect(provider.calls[0]?.request.entityKind).toBe(CREATURE_TOKEN_ENTITY_KIND)
  })

  it('returns typed failure payload when provider fails', async () => {
    const provider = createMockImageProvider({
      mode: 'failure',
      category: 'provider_unavailable',
      message: 'offline'
    })
    const result = await generateCreatureToken(provider, sampleRequest)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('provider_unavailable')
      expect(result.message).toBe('offline')
      expect(IMAGE_ERROR_CATEGORIES).toContain(result.category)
    }
  })
})
