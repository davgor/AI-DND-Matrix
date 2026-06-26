import { describe, expect, it } from 'vitest'
import { recordDyingSaveResult, startDyingSequence } from './dying'

describe('0 HP dying sequence', () => {
  it('starts unconscious with no streaks', () => {
    expect(startDyingSequence()).toEqual({
      unconscious: true,
      successStreak: 0,
      failureStreak: 0,
      stabilized: false,
      lost: false
    })
  })

  it('stabilizes after a streak of successful saves', () => {
    let state = startDyingSequence()
    state = recordDyingSaveResult(state, true)
    state = recordDyingSaveResult(state, true)
    expect(state.stabilized).toBe(false)
    state = recordDyingSaveResult(state, true)
    expect(state.stabilized).toBe(true)
    expect(state.lost).toBe(false)
  })

  it('is lost after a streak of failed saves', () => {
    let state = startDyingSequence()
    state = recordDyingSaveResult(state, false)
    state = recordDyingSaveResult(state, false)
    expect(state.lost).toBe(false)
    state = recordDyingSaveResult(state, false)
    expect(state.lost).toBe(true)
    expect(state.stabilized).toBe(false)
  })

  it('never resolves a death mode itself — it only reports stabilized/lost flags', () => {
    let state = startDyingSequence()
    for (let i = 0; i < 3; i++) {
      state = recordDyingSaveResult(state, false)
    }
    expect(Object.keys(state)).toEqual([
      'unconscious',
      'successStreak',
      'failureStreak',
      'stabilized',
      'lost'
    ])
  })
})
