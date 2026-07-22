/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import type { CampaignBestiaryEntry } from '../../../main/campaignIpc'
import type { BestiarySpecies, BestiaryVariant } from '../../../shared/bestiary/types'
import {
  CampaignReviewBestiarySection,
  shouldShowBestiarySection
} from './CampaignReviewBestiarySection'

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

function entry(
  variants: BestiaryVariant[] = [{ variantKey: 'standard' }, { variantKey: 'alpha', flavorBlurb: 'Pack leader' }]
): CampaignBestiaryEntry {
  return { species: species(), variants }
}

describe('shouldShowBestiarySection', () => {
  it('hides when empty', () => {
    expect(shouldShowBestiarySection([])).toBe(false)
  })

  it('shows when species exist', () => {
    expect(shouldShowBestiarySection([entry()])).toBe(true)
  })
})

describe('CampaignReviewBestiarySection', () => {
  it('returns null for empty roster', () => {
    expect(CampaignReviewBestiarySection({ entries: [] })).toBeNull()
  })

  it('renders species lore and variants', () => {
    const tree = CampaignReviewBestiarySection({ entries: [entry()] })
    expect(tree).not.toBeNull()
    const text = JSON.stringify(tree)
    expect(text).toContain('Bestiary')
    expect(text).toContain('Rift-beast')
    expect(text).toContain('A warped predator from the tear.')
    expect(text).toContain('standard')
    expect(text).toContain('alpha')
    expect(text).toContain('Pack leader')
  })
})
