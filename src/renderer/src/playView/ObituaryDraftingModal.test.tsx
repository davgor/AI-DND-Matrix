import { describe, expect, it } from 'vitest'
import { OBITUARY_GENERATION_FAILED_MESSAGE } from '../../../shared/campaignHub/obituary'
import { OBITUARY_DRAFTING_COPY, obituaryModalBodyCopy } from './ObituaryDraftingModal'

describe('ObituaryDraftingModal copy', () => {
  it('uses drafting copy while generation is in progress', () => {
    expect(OBITUARY_DRAFTING_COPY).toBe('Drafting your obituary')
    expect(obituaryModalBodyCopy('generating')).toBe(OBITUARY_DRAFTING_COPY)
  })

  it('uses fallback message when generation fails', () => {
    expect(obituaryModalBodyCopy('failed')).toBe(OBITUARY_GENERATION_FAILED_MESSAGE)
  })
})
