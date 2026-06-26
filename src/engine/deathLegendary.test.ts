import { describe, expect, it } from 'vitest'
import { resolveLegendaryDeath } from './deathLegendary'
import { recordDyingSaveResult, startDyingSequence } from './dying'

function lostDyingState() {
  let state = startDyingSequence()
  for (let i = 0; i < 3; i++) {
    state = recordDyingSaveResult(state, false)
  }
  return state
}

describe('resolveLegendaryDeath', () => {
  it('marks the character permanently dead given a lost dying sequence', () => {
    expect(resolveLegendaryDeath(lostDyingState())).toEqual({ permanentlyDead: true })
  })

  it('refuses to resolve without a lost dying sequence', () => {
    expect(() => resolveLegendaryDeath(startDyingSequence())).toThrow()
  })

  it('there is no revive path — resolving again still reports permanently dead', () => {
    const dying = lostDyingState()
    const first = resolveLegendaryDeath(dying)
    const second = resolveLegendaryDeath(dying)
    expect(first).toEqual({ permanentlyDead: true })
    expect(second).toEqual({ permanentlyDead: true })
  })
})
