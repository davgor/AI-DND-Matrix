import { describe, expect, it, vi } from 'vitest'
import type { GuidedCreationSendMessageResult } from '../../../shared/guidedCreation/types'
import { executeGuidedSend } from './executeGuidedSend'

function stubGuidedSend(
  impl: () => Promise<GuidedCreationSendMessageResult> | PromiseLike<GuidedCreationSendMessageResult>
): void {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      guidedCreation: {
        sendMessage: vi.fn(impl)
      }
    }
  })
}

describe('executeGuidedSend optimistic UI', () => {
  it('clears the composer and sets pending before the IPC round-trip resolves', async () => {
    let resolveSend!: (value: GuidedCreationSendMessageResult) => void
    stubGuidedSend(
      () =>
        new Promise<GuidedCreationSendMessageResult>((resolve) => {
          resolveSend = resolve
        })
    )
    const setSending = vi.fn()
    const setInputValue = vi.fn()
    const setPendingPlayerMessage = vi.fn()
    const refresh = vi.fn(async () => {})
    const pending = executeGuidedSend({
      campaignId: 'c',
      characterId: 'p',
      phase: 'identity',
      message: 'I stay positive.',
      refresh,
      setSending,
      setError: vi.fn(),
      setInputValue,
      setPendingPlayerMessage
    })
    expect(setSending).toHaveBeenCalledWith(true)
    expect(setInputValue).toHaveBeenCalledWith('')
    expect(setPendingPlayerMessage).toHaveBeenCalledWith('I stay positive.')
    expect(refresh).not.toHaveBeenCalled()
    resolveSend({ ok: true, dmReply: 'Why?', guidedCreationPhase: 'identity' })
    await pending
    expect(refresh).toHaveBeenCalledWith({ silent: true })
    expect(setPendingPlayerMessage).toHaveBeenLastCalledWith(null)
    expect(setSending).toHaveBeenLastCalledWith(false)
  })
})

describe('executeGuidedSend failure', () => {
  it('restores the composer text when send fails', async () => {
    stubGuidedSend(async () => ({ ok: false, reason: 'schema_error' }))
    const setInputValue = vi.fn()
    const setPendingPlayerMessage = vi.fn()
    await executeGuidedSend({
      campaignId: 'c',
      characterId: 'p',
      phase: 'identity',
      message: 'I stay positive.',
      refresh: vi.fn(async () => {}),
      setSending: vi.fn(),
      setError: vi.fn(),
      setInputValue,
      setPendingPlayerMessage
    })
    expect(setInputValue).toHaveBeenCalledWith('I stay positive.')
    expect(setPendingPlayerMessage).toHaveBeenLastCalledWith(null)
  })
})
