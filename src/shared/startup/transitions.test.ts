import { describe, expect, it } from 'vitest'
import { assertStartupTransition, canStartupTransition } from './transitions'

describe('startup phase transitions', () => {
  it('allows the normal boot path', () => {
    expect(canStartupTransition('idle', 'booting')).toBe(true)
    expect(canStartupTransition('booting', 'waitingDb')).toBe(true)
    expect(canStartupTransition('waitingDb', 'waitingLlm')).toBe(true)
    expect(canStartupTransition('waitingLlm', 'ready')).toBe(true)
  })

  it('allows failure from active boot phases and retry from failed', () => {
    expect(canStartupTransition('waitingDb', 'failed')).toBe(true)
    expect(canStartupTransition('waitingLlm', 'failed')).toBe(true)
    expect(canStartupTransition('failed', 'booting')).toBe(true)
  })

  it('rejects illegal transitions', () => {
    expect(canStartupTransition('idle', 'ready')).toBe(false)
    expect(canStartupTransition('ready', 'booting')).toBe(false)
    expect(canStartupTransition('ready', 'failed')).toBe(false)
    expect(() => assertStartupTransition('ready', 'booting')).toThrow(/Illegal startup transition/)
  })
})
