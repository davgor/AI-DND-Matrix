import { describe, expect, it } from 'vitest'
import {
  defaultCampaignName,
  isValidCreateCampaignRequest,
  mapFormToCreateRequest,
  validateCampaignSetupForm
} from './validation'
import { DEFAULT_CAMPAIGN_SETUP_FORM } from './types'

describe('validateCampaignSetupForm', () => {
  it('requires a premise prompt', () => {
    expect(validateCampaignSetupForm({ ...DEFAULT_CAMPAIGN_SETUP_FORM, premisePrompt: '  ' })).toBeTruthy()
  })

  it('requires respawn location when respawn mode is selected', () => {
    const error = validateCampaignSetupForm({
      ...DEFAULT_CAMPAIGN_SETUP_FORM,
      premisePrompt: 'A haunted marsh',
      deathMode: 'respawn'
    })
    expect(error).toMatch(/Respawn/)
  })

  it('rejects out-of-range region count', () => {
    const error = validateCampaignSetupForm({
      ...DEFAULT_CAMPAIGN_SETUP_FORM,
      premisePrompt: 'A haunted marsh',
      regionCount: 6
    })
    expect(error).toMatch(/Regions to generate/)
  })

  it('rejects out-of-range npcs per region', () => {
    const error = validateCampaignSetupForm({
      ...DEFAULT_CAMPAIGN_SETUP_FORM,
      premisePrompt: 'A haunted marsh',
      npcsPerRegion: 11
    })
    expect(error).toMatch(/NPCs per region/)
  })

  it('accepts zero region and zero npc counts', () => {
    expect(
      validateCampaignSetupForm({
        ...DEFAULT_CAMPAIGN_SETUP_FORM,
        premisePrompt: 'A haunted marsh',
        regionCount: 0,
        npcsPerRegion: 0
      })
    ).toBeNull()
  })
})

describe('mapFormToCreateRequest: premise and counts', () => {
  it('maps premise and defaults name from premise when empty', () => {
    const request = mapFormToCreateRequest(
      { ...DEFAULT_CAMPAIGN_SETUP_FORM, premisePrompt: 'A flooded kingdom under eternal rain' },
      'session-1'
    )
    expect(request.sessionId).toBe('session-1')
    expect(request.name).toBe(defaultCampaignName('A flooded kingdom under eternal rain'))
    expect(request.deathMode).toBe('standard')
    expect(request.regionCount).toBe(2)
    expect(request.npcsPerRegion).toBe(3)
  })

  it('includes custom generation counts', () => {
    const request = mapFormToCreateRequest(
      {
        ...DEFAULT_CAMPAIGN_SETUP_FORM,
        premisePrompt: 'A sparse frontier',
        regionCount: 1,
        npcsPerRegion: 1
      },
      'session-2'
    )
    expect(request.regionCount).toBe(1)
    expect(request.npcsPerRegion).toBe(1)
  })
})

describe('mapFormToCreateRequest: token flags', () => {
  it('maps npcFaceTokenGenerationEnabled (default false)', () => {
    const off = mapFormToCreateRequest(
      { ...DEFAULT_CAMPAIGN_SETUP_FORM, premisePrompt: 'A quiet village' },
      'session-3'
    )
    expect(off.npcFaceTokenGenerationEnabled).toBe(false)

    const on = mapFormToCreateRequest(
      {
        ...DEFAULT_CAMPAIGN_SETUP_FORM,
        premisePrompt: 'A quiet village',
        npcFaceTokenGenerationEnabled: true
      },
      'session-4'
    )
    expect(on.npcFaceTokenGenerationEnabled).toBe(true)
  })

  it('maps enemyTokenGenerationEnabled (default false)', () => {
    const off = mapFormToCreateRequest(
      { ...DEFAULT_CAMPAIGN_SETUP_FORM, premisePrompt: 'A quiet village' },
      'session-5'
    )
    expect(off.enemyTokenGenerationEnabled).toBe(false)

    const on = mapFormToCreateRequest(
      {
        ...DEFAULT_CAMPAIGN_SETUP_FORM,
        premisePrompt: 'A quiet village',
        enemyTokenGenerationEnabled: true
      },
      'session-6'
    )
    expect(on.enemyTokenGenerationEnabled).toBe(true)
  })
})

describe('isValidCreateCampaignRequest: core fields', () => {
  it('accepts a minimal valid payload with omitted generation counts', () => {
    expect(
      isValidCreateCampaignRequest({ sessionId: 's1', premisePrompt: 'A haunted marsh' })
    ).toBe(true)
  })

  it('accepts explicit valid generation counts', () => {
    expect(
      isValidCreateCampaignRequest({
        sessionId: 's1',
        premisePrompt: 'A haunted marsh',
        regionCount: 0,
        npcsPerRegion: 0
      })
    ).toBe(true)
  })

  it('rejects missing premise', () => {
    expect(isValidCreateCampaignRequest({ sessionId: 's1', premisePrompt: '  ' })).toBe(false)
  })

  it('rejects invalid region count', () => {
    expect(
      isValidCreateCampaignRequest({
        sessionId: 's1',
        premisePrompt: 'A haunted marsh',
        regionCount: 9
      })
    ).toBe(false)
  })

  it('rejects non-integer npcs per region', () => {
    expect(
      isValidCreateCampaignRequest({
        sessionId: 's1',
        premisePrompt: 'A haunted marsh',
        npcsPerRegion: 2.5
      })
    ).toBe(false)
  })
})

describe('isValidCreateCampaignRequest: npcFaceTokenGenerationEnabled', () => {
  it('rejects non-boolean npcFaceTokenGenerationEnabled', () => {
    expect(
      isValidCreateCampaignRequest({
        sessionId: 's1',
        premisePrompt: 'A haunted marsh',
        npcFaceTokenGenerationEnabled: 'yes'
      })
    ).toBe(false)
  })

  it('accepts npcFaceTokenGenerationEnabled boolean', () => {
    expect(
      isValidCreateCampaignRequest({
        sessionId: 's1',
        premisePrompt: 'A haunted marsh',
        npcFaceTokenGenerationEnabled: true
      })
    ).toBe(true)
  })
})

describe('isValidCreateCampaignRequest: enemyTokenGenerationEnabled', () => {
  it('rejects non-boolean enemyTokenGenerationEnabled', () => {
    expect(
      isValidCreateCampaignRequest({
        sessionId: 's1',
        premisePrompt: 'A haunted marsh',
        enemyTokenGenerationEnabled: 'yes'
      })
    ).toBe(false)
  })

  it('accepts enemyTokenGenerationEnabled boolean', () => {
    expect(
      isValidCreateCampaignRequest({
        sessionId: 's1',
        premisePrompt: 'A haunted marsh',
        enemyTokenGenerationEnabled: true
      })
    ).toBe(true)
  })
})
