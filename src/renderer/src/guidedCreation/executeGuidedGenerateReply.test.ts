import { describe, expect, it, vi } from 'vitest'
import { executeGuidedGenerateReply } from './executeGuidedGenerateReply'

function stubGenerateReply(
  impl: ReturnType<typeof vi.fn>
): void {
  vi.stubGlobal('window', { guidedCreation: { generateReply: impl } })
}

describe('executeGuidedGenerateReply success', () => {
  it('fills the composer with the generated reply on success', async () => {
    const setGenerating = vi.fn()
    const setError = vi.fn()
    const setInputValue = vi.fn()
    const generateReply = vi.fn().mockResolvedValue({
      ok: true,
      reply: 'I am Kael of the marsh.'
    })
    stubGenerateReply(generateReply)

    const result = await executeGuidedGenerateReply({
      campaignId: 'c',
      characterId: 'p',
      phase: 'identity',
      existingDraft: '',
      generating: false,
      setGenerating,
      setError,
      setInputValue
    })

    expect(result).toEqual({ ok: true, reply: 'I am Kael of the marsh.' })
    expect(generateReply).toHaveBeenCalledWith({
      campaignId: 'c',
      characterId: 'p',
      phase: 'identity',
      existingDraft: null
    })
    expect(setInputValue).toHaveBeenCalledWith('I am Kael of the marsh.')
    expect(setGenerating).toHaveBeenCalledWith(true)
    expect(setGenerating).toHaveBeenLastCalledWith(false)
    expect(setError).toHaveBeenCalledWith(null)
  })
})

describe('executeGuidedGenerateReply failure', () => {
  it('surfaces an error without clearing the composer on failure', async () => {
    const setInputValue = vi.fn()
    const setError = vi.fn()
    stubGenerateReply(vi.fn().mockResolvedValue({ ok: false, reason: 'provider_error' }))

    const result = await executeGuidedGenerateReply({
      campaignId: 'c',
      characterId: 'p',
      phase: 'identity',
      existingDraft: 'partial draft',
      generating: false,
      setGenerating: vi.fn(),
      setError,
      setInputValue
    })

    expect(result).toEqual({ ok: false, reason: 'provider_error' })
    expect(setInputValue).not.toHaveBeenCalled()
    expect(setError).toHaveBeenCalledWith(expect.stringMatching(/generate a reply/i))
  })

  it('no-ops while already generating', async () => {
    const generateReply = vi.fn()
    stubGenerateReply(generateReply)

    const result = await executeGuidedGenerateReply({
      campaignId: 'c',
      characterId: 'p',
      phase: 'identity',
      existingDraft: '',
      generating: true,
      setGenerating: vi.fn(),
      setError: vi.fn(),
      setInputValue: vi.fn()
    })

    expect(result).toBeNull()
    expect(generateReply).not.toHaveBeenCalled()
  })
})
