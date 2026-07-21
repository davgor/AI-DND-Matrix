import { describe, expect, it } from 'vitest'
import { isNpcAppearanceTraits, normalizeNpcAppearance } from './appearance'

describe('normalizeNpcAppearance', () => {
  it('trims strings and coerces blank values to null', () => {
    expect(
      normalizeNpcAppearance({
        hairColor: '  auburn ',
        age: '',
        eyeColor: '   '
      })
    ).toEqual({
      hairColor: 'auburn',
      age: null,
      eyeColor: null
    })
  })

  it('defaults missing fields to null', () => {
    expect(normalizeNpcAppearance(undefined)).toEqual({
      hairColor: null,
      age: null,
      eyeColor: null
    })
  })
})

describe('isNpcAppearanceTraits', () => {
  it('accepts nullable string fields', () => {
    expect(
      isNpcAppearanceTraits({ hairColor: 'black', age: null, eyeColor: 'green' })
    ).toBe(true)
  })

  it('rejects non-string hairColor', () => {
    expect(isNpcAppearanceTraits({ hairColor: 1, age: null, eyeColor: null })).toBe(false)
  })
})
