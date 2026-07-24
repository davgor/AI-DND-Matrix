/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import type { BestiaryReviewEntry } from '../../../shared/bestiary/reviewRoster'
import type { BestiarySpecies, BestiaryVariant } from '../../../shared/bestiary/types'
import { CampaignReviewBestiaryModal } from './CampaignReviewBestiaryModal'
import {
  CampaignReviewBestiarySection,
  shouldShowBestiarySection
} from './CampaignReviewBestiarySection'

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: <T,>(initial: T): [T, (next: T) => void] => [initial, () => undefined]
  }
})

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
  variants: BestiaryVariant[] = [{ variantKey: 'standard' }, { variantKey: 'alpha', flavorBlurb: 'Pack leader' }],
  origin: BestiaryReviewEntry['origin'] = 'campaign'
): BestiaryReviewEntry {
  return { species: species(), variants, origin }
}

function isJsxElement(node: unknown): node is JSX.Element {
  return typeof node === 'object' && node !== null && 'props' in node
}

function expandNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((child) => expandNode(child))
  }
  if (!isJsxElement(node)) {
    return node
  }
  if (typeof node.type === 'function') {
    return expandNode(node.type(node.props))
  }
  const children = node.props.children
  if (children === undefined) {
    return node
  }
  const expandedChildren = Array.isArray(children)
    ? children.map((child) => expandNode(child))
    : expandNode(children)
  return { ...node, props: { ...node.props, children: expandedChildren } }
}

function collectText(node: unknown): string {
  if (Array.isArray(node)) {
    return node.map((child) => collectText(child)).join(' ')
  }
  const expanded = expandNode(node)
  if (Array.isArray(expanded)) {
    return expanded.map((child) => collectText(child)).join(' ')
  }
  if (typeof expanded === 'string' || typeof expanded === 'number') {
    return String(expanded)
  }
  if (!isJsxElement(expanded)) {
    return ''
  }
  const children = expanded.props.children
  if (children === undefined) {
    return ''
  }
  if (Array.isArray(children)) {
    return children.map((child) => collectText(child)).join(' ')
  }
  return collectText(children)
}

describe('shouldShowBestiarySection', () => {
  it('hides when empty', () => {
    expect(shouldShowBestiarySection([])).toBe(false)
  })

  it('shows when species exist', () => {
    expect(shouldShowBestiarySection([entry()])).toBe(true)
  })
})

describe('CampaignReviewBestiarySection summary chrome (153.4)', () => {
  it('shows counts and View Bestiary without dumping inline lore', () => {
    const tree = CampaignReviewBestiarySection({
      campaignId: 'camp-1',
      entries: [
        entry(),
        entry([], 'default')
      ],
      onDetailChange: () => undefined
    })
    expect(tree).not.toBeNull()
    const text = collectText(tree)
    expect(text).toContain('Bestiary')
    expect(text).toContain('View Bestiary')
    expect(text).toContain('campaign-specific')
    expect(text).toContain('default catalog')
    expect(text).not.toContain('A warped predator from the tear.')
  })
})

describe('CampaignReviewBestiaryModal (153.4)', () => {
  it('lists creatures with origin labels and Add', () => {
    const tree = CampaignReviewBestiaryModal({
      entries: [
        entry(),
        {
          origin: 'default',
          species: species({
            id: 'catalog:goblin-scout',
            key: 'goblin-scout',
            name: 'Goblin Scout',
            baseLore: 'Seed catalog foe.',
            buckets: ['goblinoid'],
            tags: ['raider'],
            defaultCatalogKey: 'goblin-scout'
          }),
          variants: [{ variantKey: 'standard', flavorBlurb: 'Catalog combat template' }]
        }
      ],
      canAdd: true,
      onAdd: () => undefined,
      onClose: () => undefined
    })
    const text = collectText(tree)
    expect(text).toContain('Rift-beast')
    expect(text).toContain('Goblin Scout')
    expect(text).toContain('Campaign-specific')
    expect(text).toContain('Default enemy')
    expect(text).toContain('Add')
    expect(tree.props.className).toContain('campaign-review-overlay--content-width')
  })
})
