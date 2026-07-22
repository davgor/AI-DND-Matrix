import { describe, expect, it } from 'vitest'
import {
  buildSpeciesAppearancePrompt,
  buildSpeciesLorePrompt,
  parseSpeciesAppearanceResponse,
  parseSpeciesLoreResponse,
  SPECIES_LORE_SYSTEM_PROMPT
} from './generateSpeciesPrompts'

describe('buildSpeciesLorePrompt', () => {
  it('requests baseLore and visualAppearance fields', () => {
    const prompt = buildSpeciesLorePrompt({
      name: 'Rift-beast',
      buckets: ['beast'],
      tags: ['pack-hunter'],
      settingHints: 'Near planar rifts'
    })

    expect(prompt).toContain('visual appearance')
    expect(prompt).toContain('"baseLore"')
    expect(prompt).toContain('"visualAppearance"')
    expect(prompt).toContain('silhouette')
    expect(prompt).toContain('primaryColors')
    expect(prompt).toContain('Near planar rifts')
  })
})

describe('buildSpeciesAppearancePrompt', () => {
  it('asks only for visualAppearance given preset lore', () => {
    const prompt = buildSpeciesAppearancePrompt({
      name: 'Rift-beast',
      baseLore: 'Pack hunters of the rift edge.',
      buckets: ['beast'],
      tags: ['rift']
    })

    expect(prompt).toContain('visual appearance only')
    expect(prompt).not.toContain('"baseLore"')
    expect(prompt).toContain('"visualAppearance"')
    expect(prompt).toContain('Pack hunters of the rift edge.')
  })
})

describe('SPECIES_LORE_SYSTEM_PROMPT', () => {
  it('includes visualAppearance in schema guidance', () => {
    expect(SPECIES_LORE_SYSTEM_PROMPT).toContain('visualAppearance')
    expect(SPECIES_LORE_SYSTEM_PROMPT).toContain('baseLore')
  })
})

describe('parseSpeciesLoreResponse', () => {
  const usableAppearance = {
    silhouette: 'quadruped wolf-like',
    sizeClass: 'large',
    primaryColors: ['violet', 'charcoal'],
    distinguishingMarks: 'planar scars along the flank',
    textureOrMaterial: 'crackling fur'
  }

  it('accepts baseLore with usable visualAppearance', () => {
    expect(
      parseSpeciesLoreResponse({
        baseLore: '  Pack predators of the border woods.  ',
        visualAppearance: usableAppearance
      })
    ).toEqual({
      baseLore: 'Pack predators of the border woods.',
      visualAppearance: usableAppearance
    })
  })

  it('rejects missing or empty baseLore', () => {
    expect(parseSpeciesLoreResponse({ visualAppearance: usableAppearance })).toBeUndefined()
    expect(parseSpeciesLoreResponse({ baseLore: '   ', visualAppearance: usableAppearance })).toBeUndefined()
  })

  it('rejects missing or empty visualAppearance', () => {
    expect(parseSpeciesLoreResponse({ baseLore: 'Lore.' })).toBeUndefined()
    expect(
      parseSpeciesLoreResponse({
        baseLore: 'Lore.',
        visualAppearance: {
          silhouette: null,
          sizeClass: null,
          primaryColors: [],
          distinguishingMarks: null,
          textureOrMaterial: null
        }
      })
    ).toBeUndefined()
  })

  it('ignores combat numbers in payload', () => {
    const parsed = parseSpeciesLoreResponse({
      baseLore: 'A cunning predator.',
      visualAppearance: usableAppearance,
      hp: 42,
      ac: 15
    })
    expect(parsed?.baseLore).toBe('A cunning predator.')
    expect(parsed?.visualAppearance.silhouette).toBe('quadruped wolf-like')
  })
})

describe('parseSpeciesAppearanceResponse', () => {
  it('accepts usable visualAppearance only', () => {
    expect(
      parseSpeciesAppearanceResponse({
        visualAppearance: {
          silhouette: 'serpentine',
          sizeClass: 'huge',
          primaryColors: ['emerald'],
          distinguishingMarks: null,
          textureOrMaterial: 'wet scales'
        }
      })
    ).toEqual({
      visualAppearance: {
        silhouette: 'serpentine',
        sizeClass: 'huge',
        primaryColors: ['emerald'],
        distinguishingMarks: null,
        textureOrMaterial: 'wet scales'
      }
    })
  })

  it('rejects empty visualAppearance', () => {
    expect(parseSpeciesAppearanceResponse({ visualAppearance: {} })).toBeUndefined()
    expect(parseSpeciesAppearanceResponse({})).toBeUndefined()
  })
})
