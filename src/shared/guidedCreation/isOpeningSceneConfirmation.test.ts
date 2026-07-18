import { describe, expect, it } from 'vitest'
import { isOpeningSceneConfirmation } from './isOpeningSceneConfirmation'

describe('isOpeningSceneConfirmation', () => {
  it('recognizes clear affirmatives', () => {
    expect(isOpeningSceneConfirmation('Yup that works for me')).toBe(true)
    expect(isOpeningSceneConfirmation('Yes, start there.')).toBe(true)
    expect(isOpeningSceneConfirmation('Let us begin')).toBe(true)
    expect(isOpeningSceneConfirmation('looks good')).toBe(true)
    expect(isOpeningSceneConfirmation('ok')).toBe(true)
  })

  it('rejects change requests and unrelated replies', () => {
    expect(isOpeningSceneConfirmation('Can we start in the tavern instead?')).toBe(false)
    expect(isOpeningSceneConfirmation('Not quite — more danger please')).toBe(false)
    expect(isOpeningSceneConfirmation('')).toBe(false)
  })
})
