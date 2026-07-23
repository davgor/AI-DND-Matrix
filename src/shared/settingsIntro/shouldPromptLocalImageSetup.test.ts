import { describe, expect, it } from 'vitest'
import { shouldPromptLocalImageSetup } from './shouldPromptLocalImageSetup'

describe('shouldPromptLocalImageSetup', () => {
  it('returns true only when local LLM just completed, not declined, image off', () => {
    expect(
      shouldPromptLocalImageSetup({
        localLlmJustCompleted: true,
        postLocalLlmPromptDeclined: false,
        imageEnabled: false
      })
    ).toBe(true)
  })

  it('returns false when user declined the prompt', () => {
    expect(
      shouldPromptLocalImageSetup({
        localLlmJustCompleted: true,
        postLocalLlmPromptDeclined: true,
        imageEnabled: false
      })
    ).toBe(false)
  })

  it('returns false when image generation is already enabled', () => {
    expect(
      shouldPromptLocalImageSetup({
        localLlmJustCompleted: true,
        postLocalLlmPromptDeclined: false,
        imageEnabled: true
      })
    ).toBe(false)
  })

  it('returns false when local LLM setup did not just complete', () => {
    expect(
      shouldPromptLocalImageSetup({
        localLlmJustCompleted: false,
        postLocalLlmPromptDeclined: false,
        imageEnabled: false
      })
    ).toBe(false)
  })
})
