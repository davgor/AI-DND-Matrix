import { describe, expect, it } from 'vitest'
import { hasUsableCreatureAppearance, isCreatureAppearanceTraits, normalizeCreatureAppearance } from './appearance'

describe('normalizeCreatureAppearance', () => {
  it('trims strings and drops empty values', () => {
    expect(
      normalizeCreatureAppearance({
        silhouette: '  wolf-like  ',
        sizeClass: ' ',
        primaryColors: [' ash ', '', 'bone'],
        distinguishingMarks: null,
        textureOrMaterial: undefined
      })
    ).toEqual({
      silhouette: 'wolf-like',
      sizeClass: null,
      primaryColors: ['ash', 'bone'],
      distinguishingMarks: null,
      textureOrMaterial: null
    })
  })

  it('returns empty defaults for nullish input', () => {
    expect(normalizeCreatureAppearance(null)).toEqual({
      silhouette: null,
      sizeClass: null,
      primaryColors: [],
      distinguishingMarks: null,
      textureOrMaterial: null
    })
  })
})

describe('hasUsableCreatureAppearance', () => {
  it('returns false when every field is empty after normalize', () => {
    expect(hasUsableCreatureAppearance(normalizeCreatureAppearance(null))).toBe(false)
  })

  it('returns true when at least one field is populated', () => {
    expect(
      hasUsableCreatureAppearance(
        normalizeCreatureAppearance({
          silhouette: 'serpentine',
          sizeClass: null,
          primaryColors: [],
          distinguishingMarks: null,
          textureOrMaterial: null
        })
      )
    ).toBe(true)
  })
})

describe('isCreatureAppearanceTraits', () => {
  it('accepts normalized shapes', () => {
    expect(
      isCreatureAppearanceTraits({
        silhouette: 'quadruped',
        sizeClass: 'large',
        primaryColors: ['grey'],
        distinguishingMarks: 'scarred muzzle',
        textureOrMaterial: 'matted fur'
      })
    ).toBe(true)
  })

  it('rejects non-array primaryColors', () => {
    expect(
      isCreatureAppearanceTraits({
        silhouette: null,
        sizeClass: null,
        primaryColors: 'grey',
        distinguishingMarks: null,
        textureOrMaterial: null
      })
    ).toBe(false)
  })
})
