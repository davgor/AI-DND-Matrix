import { describe, expect, it } from 'vitest'
import {
  defaultCampaignName,
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
})

describe('mapFormToCreateRequest', () => {
  it('maps premise and defaults name from premise when empty', () => {
    const request = mapFormToCreateRequest(
      { ...DEFAULT_CAMPAIGN_SETUP_FORM, premisePrompt: 'A flooded kingdom under eternal rain' },
      'session-1'
    )
    expect(request.sessionId).toBe('session-1')
    expect(request.name).toBe(defaultCampaignName('A flooded kingdom under eternal rain'))
    expect(request.deathMode).toBe('standard')
  })
})
