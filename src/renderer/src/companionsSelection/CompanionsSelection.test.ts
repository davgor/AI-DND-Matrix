import { describe, expect, it } from 'vitest'
import { canGenerateCompanionPrompt } from './CompanionsSelectionForm'

describe('canGenerateCompanionPrompt', () => {
  it('disables Generate when the prompt is empty or whitespace', () => {
    expect(canGenerateCompanionPrompt('')).toBe(false)
    expect(canGenerateCompanionPrompt('   ')).toBe(false)
  })

  it('enables Generate when the prompt has content', () => {
    expect(canGenerateCompanionPrompt('A loyal dwarf')).toBe(true)
  })
})
