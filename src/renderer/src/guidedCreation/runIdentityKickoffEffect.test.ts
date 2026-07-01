import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GuidedCreationState } from '../../../shared/guidedCreation/types'
import * as guidedIdentityKickoff from './guidedIdentityKickoff'
import { runIdentityKickoffEffect } from './runIdentityKickoffEffect'

function emptyIdentityState(): GuidedCreationState {
  return {
    guidedCreationPhase: 'identity',
    foundations: {
      who: { complete: false },
      why: { complete: false },
      where: { complete: false },
      what: { complete: false }
    },
    openingScene: null,
    alignment: null,
    messages: []
  }
}

describe('runIdentityKickoffEffect', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clears kickingOff after kickoff even when the effect cleanup runs first', async () => {
    let resolveKickoff!: (value: { ok: boolean; kickedOff: boolean }) => void
    const kickoffPromise = new Promise<{ ok: boolean; kickedOff: boolean }>((resolve) => {
      resolveKickoff = resolve
    })
    vi.spyOn(guidedIdentityKickoff, 'kickoffGuidedIdentity').mockReturnValue(kickoffPromise)

    const setKickingOff = vi.fn()
    const kickoffStartedRef = { current: false }
    const cleanup = runIdentityKickoffEffect({
      campaignId: 'campaign-1',
      characterId: 'char-1',
      phase: 'identity',
      loading: false,
      kickingOff: false,
      sending: false,
      state: emptyIdentityState(),
      kickoffStartedRef,
      refresh: vi.fn().mockResolvedValue(undefined),
      setKickingOff,
      setError: vi.fn()
    })

    expect(setKickingOff).toHaveBeenCalledWith(true)
    cleanup?.()

    resolveKickoff({ ok: true, kickedOff: true })
    await kickoffPromise
    await Promise.resolve()

    expect(setKickingOff).toHaveBeenLastCalledWith(false)
  })
})
