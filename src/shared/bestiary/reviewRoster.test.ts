import { describe, expect, it } from 'vitest'
import type { BestiarySpecies } from './types'
import {
  countBestiaryOrigins,
  deriveSpeciesNameFromPrompt,
  filterBestiaryReviewEntries,
  type BestiaryReviewEntry
} from './reviewRoster'

function species(partial?: Partial<BestiarySpecies>): BestiarySpecies {
  return {
    id: 'sp-1',
    campaignId: 'camp-1',
    key: 'rift-beast',
    name: 'Rift-beast',
    baseLore: 'A warped predator from the tear.',
    visualAppearance: null,
    creatureTokenPath: null,
    buckets: ['beast'],
    tags: ['rift'],
    defaultCatalogKey: 'dire-wolf',
    ...partial
  }
}

function entry(partial?: Partial<BestiaryReviewEntry>): BestiaryReviewEntry {
  return {
    species: species(),
    variants: [{ variantKey: 'standard' }],
    origin: 'campaign',
    ...partial
  }
}

describe('deriveSpeciesNameFromPrompt', () => {
  it('uses a short first line as the name', () => {
    expect(deriveSpeciesNameFromPrompt('Coral Titan\nWagon-sized crab with a reef shell.')).toBe(
      'Coral Titan'
    )
  })

  it('title-cases leading words when the prompt is a sentence', () => {
    expect(deriveSpeciesNameFromPrompt('a coral-shelled crab the size of a wagon')).toBe(
      'A Coral-shelled Crab The Size'
    )
  })
})

describe('filterBestiaryReviewEntries', () => {
  const roster = [
    entry({ origin: 'campaign' }),
    entry({
      origin: 'default',
      species: species({
        id: 'catalog:goblin-scout',
        key: 'goblin-scout',
        name: 'Goblin Scout',
        baseLore: 'Seed catalog foe.',
        tags: ['raider'],
        buckets: ['goblinoid'],
        defaultCatalogKey: 'goblin-scout'
      })
    })
  ]

  it('filters by origin', () => {
    expect(filterBestiaryReviewEntries(roster, { query: '', originFilter: 'default' })).toHaveLength(1)
    expect(filterBestiaryReviewEntries(roster, { query: '', originFilter: 'campaign' })).toHaveLength(1)
    expect(filterBestiaryReviewEntries(roster, { query: '', originFilter: 'all' })).toHaveLength(2)
  })

  it('searches name and tags', () => {
    const found = filterBestiaryReviewEntries(roster, { query: 'goblin', originFilter: 'all' })
    expect(found).toHaveLength(1)
    expect(found[0]?.species.name).toBe('Goblin Scout')
  })
})

describe('countBestiaryOrigins', () => {
  it('counts default and campaign rows', () => {
    expect(
      countBestiaryOrigins([
        entry({ origin: 'default' }),
        entry({ origin: 'campaign' }),
        entry({ origin: 'campaign', species: species({ id: 'sp-2', key: 'wave-spawn' }) })
      ])
    ).toEqual({ defaultCount: 1, campaignCount: 2 })
  })
})
