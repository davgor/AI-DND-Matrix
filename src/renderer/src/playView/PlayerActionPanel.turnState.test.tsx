import { describe, expect, it } from 'vitest'
import { turnStateMessage } from './PlayerActionPanel'

describe('turnStateMessage', () => {
  it('surfaces submitting and imprisoned turn-state messages', () => {
    expect(
      turnStateMessage({
        entries: [],
        inputValue: '',
        onInputChange: () => {},
        onSubmit: () => {},
        submitting: true
      })
    ).toContain('Resolving')

    expect(
      turnStateMessage({
        entries: [],
        inputValue: '',
        onInputChange: () => {},
        onSubmit: () => {},
        submitting: false,
        playerImprisoned: true
      })
    ).toContain('imprisoned')
  })
})
