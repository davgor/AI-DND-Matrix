import { describe, expect, it } from 'vitest'
import {
  IMAGE_ERROR_CATEGORIES,
  createMockImageProvider
} from '../imageGeneration/types'
import { buildPlayerCharacterIconPrompt } from './prompt'
import { generatePlayerCharacterIcon } from './generate'
import {
  PLAYER_CHARACTER_ICON_ENTITY_KIND,
  type PlayerCharacterIconGenerateRequest
} from './types'

const sampleRequest: PlayerCharacterIconGenerateRequest = {
  entityId: 'pc-1',
  campaignId: 'camp-1',
  appearancePrompt: 'weathered human ranger with a scar across the left cheek and ash-blond hair',
  identity: {
    name: 'Kael',
    role: 'Ranger',
    raceKey: 'human',
    genderKey: 'male',
    age: 'young adult',
    hairColor: 'ash-blond',
    eyeColor: 'grey'
  },
  styleContext: { presetId: null, notes: null }
}

describe('buildPlayerCharacterIconPrompt', () => {
  it('requires head-and-shoulders framing and includes appearance prompt', () => {
    const prompt = buildPlayerCharacterIconPrompt(sampleRequest)
    expect(prompt.toLowerCase()).toMatch(/head[\s-]and[\s-]shoulders|head\/shoulders|portrait/)
    expect(prompt.toLowerCase()).toMatch(/not full-body|no full-body|not a full-body/)
    expect(prompt).toContain('Kael')
    expect(prompt).toContain(sampleRequest.appearancePrompt)
    expect(prompt).toContain(PLAYER_CHARACTER_ICON_ENTITY_KIND)
  })
})

describe('generatePlayerCharacterIcon with mock provider', () => {
  it('returns success payload with image bytes on happy path', async () => {
    const provider = createMockImageProvider({
      mode: 'success',
      mimeType: 'image/png',
      bytesBase64: 'bbb'
    })
    const result = await generatePlayerCharacterIcon(provider, sampleRequest)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.mimeType).toBe('image/png')
      expect(result.bytesBase64).toBe('bbb')
      expect(result.prompt).toContain('Kael')
      expect(result.prompt).toContain(sampleRequest.appearancePrompt)
    }
    expect(provider.calls).toHaveLength(1)
    expect(provider.calls[0]?.request.entityKind).toBe(PLAYER_CHARACTER_ICON_ENTITY_KIND)
    expect(provider.calls[0]?.request.entityId).toBe('pc-1')
  })

  it('returns typed failure payload when provider fails', async () => {
    const provider = createMockImageProvider({
      mode: 'failure',
      category: 'timeout',
      message: 'slow'
    })
    const result = await generatePlayerCharacterIcon(provider, sampleRequest)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('timeout')
      expect(result.message).toBe('slow')
      expect(IMAGE_ERROR_CATEGORIES).toContain(result.category)
    }
  })
})
