import { describe, expect, it, vi } from 'vitest'
import type { Faction, FactionRelation } from '../../../shared/factions'
import type { Deity } from '../../../db/repositories/deities'
import {
  CampaignReviewFactionsModal,
  formatFactionRelationReadout
} from './CampaignReviewFactionsModal'
import {
  CampaignReviewFactionsSection,
  shouldShowFactionsSection
} from './CampaignReviewFactionsSection'

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: <T,>(initial: T): [T, (next: T) => void] => [initial, () => undefined]
  }
})

function makeFaction(overrides: Partial<Faction> = {}): Faction {
  return {
    id: 'f1',
    campaignId: 'c1',
    key: 'harbor-watch',
    name: 'Harbor Watch',
    kind: 'civic',
    summary: 'Keeps the docks orderly.',
    motivation: 'Order on the wharves.',
    publicFace: 'Uniformed marshals.',
    methods: 'Patrols and harbor fees.',
    deityId: null,
    homeRegionId: null,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    source: 'campaign_create',
    ...overrides
  }
}

function makeRelation(overrides: Partial<FactionRelation> = {}): FactionRelation {
  return {
    id: 'rel-1',
    campaignId: 'c1',
    factionAId: 'f1',
    factionBId: 'f2',
    stance: 'rival',
    summary: 'Feuds over docking rights.',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

function makeDeity(overrides: Partial<Deity> = {}): Deity {
  return {
    id: 'd1',
    campaignId: 'c1',
    name: 'Vhalor',
    epithet: 'the Drowned Judge',
    domains: ['death', 'tides'],
    tenets: ['Keep every oath'],
    blurb: 'A stern tide-god.',
    isForgotten: false,
    sortOrder: 0,
    ...overrides
  }
}

function isJsxElement(node: unknown): node is JSX.Element {
  return typeof node === 'object' && node !== null && 'props' in node
}

function expandNode(node: unknown): unknown {
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

describe('shouldShowFactionsSection', () => {
  it('hides legacy empty factions and shows when summary or roster exists', () => {
    expect(shouldShowFactionsSection('', [])).toBe(false)
    expect(shouldShowFactionsSection('   ', [])).toBe(false)
    expect(shouldShowFactionsSection('Courts still scheme.', [])).toBe(true)
    expect(shouldShowFactionsSection('', [makeFaction()])).toBe(true)
  })
})

describe('formatFactionRelationReadout', () => {
  it('formats undirected stance lines with faction names', () => {
    expect(
      formatFactionRelationReadout(makeRelation(), {
        f1: 'Harbor Watch',
        f2: 'Salt Cartel'
      })
    ).toBe('Harbor Watch ↔ Salt Cartel: rival')
  })
})

describe('CampaignReviewFactionsSection empty', () => {
  it('returns null for empty legacy campaigns', () => {
    const tree = CampaignReviewFactionsSection({
      factionsSummary: '',
      factionPressure: 'light',
      factions: [],
      relations: [],
      deities: [],
      readOnly: true
    })
    expect(tree).toBeNull()
  })
})

describe('CampaignReviewFactionsSection summary chrome (153.3)', () => {
  it('shows pressure and summary with View Factions, without inline roster or relations', () => {
    const tree = CampaignReviewFactionsSection({
      factionsSummary: 'A quiet watch and a traders’ circle keep the vale calm.',
      factionPressure: 'light',
      factions: [
        makeFaction(),
        makeFaction({
          id: 'f2',
          key: 'traders-circle',
          name: 'Traders’ Circle',
          kind: 'mercantile',
          sortOrder: 1
        })
      ],
      relations: [makeRelation({ factionAId: 'f1', factionBId: 'f2', stance: 'tense' })],
      deities: [],
      readOnly: true
    })
    expect(tree).not.toBeNull()
    const text = collectText(tree)
    expect(text).toContain('Factions')
    expect(text).toContain('light')
    expect(text).toContain('A quiet watch and a traders’ circle keep the vale calm.')
    expect(text).toContain('View Factions')
    expect(text).not.toContain('Harbor Watch')
    expect(text).not.toContain('Traders’ Circle')
    expect(text).not.toContain('↔')
  })
})

function richFactionsModalTree(): JSX.Element {
  return CampaignReviewFactionsModal({
    factionPressure: 'heavy',
    factions: [
      makeFaction({ id: 'f1', key: 'ash-court', name: 'Ash Court', kind: 'political' }),
      makeFaction({
        id: 'f2',
        key: 'tide-temple',
        name: 'Tide Temple',
        kind: 'religious',
        summary: 'Guards the drowned shrines.',
        motivation: 'Keep Vhalor’s rites alive.',
        publicFace: 'Tide priests in salt robes.',
        methods: 'Tithes and midnight vigils.',
        deityId: 'd1',
        sortOrder: 1
      })
    ],
    relations: [
      makeRelation({
        factionAId: 'f1',
        factionBId: 'f2',
        stance: 'tense',
        summary: 'Argue over harbor burials.'
      })
    ],
    deities: [makeDeity()],
    onClose: () => undefined
  })
}

describe('CampaignReviewFactionsModal (153.3)', () => {
  it('surfaces rich faction fields, deity, and relation summaries', () => {
    const text = collectText(richFactionsModalTree())
    expect(text).toMatch(/heavy|Ash Court|political|Keeps the docks orderly/)
    expect(text).toMatch(/Order on the wharves|Uniformed marshals|Patrols and harbor fees/)
    expect(text).toMatch(/Tide Temple|Vhalor|Guards the drowned shrines/)
    expect(text).toContain('Ash Court ↔ Tide Temple: tense')
    expect(text).toContain('Argue over harbor burials.')
  })

  it('uses content-width overlay and factions modal class', () => {
    const tree = CampaignReviewFactionsModal({
      factionPressure: 'medium',
      factions: [makeFaction()],
      relations: [],
      deities: [],
      onClose: () => undefined
    })
    expect(tree.props.className).toContain('campaign-review-overlay--content-width')
    const dialog = tree.props.children as JSX.Element
    expect(dialog.props.className).toContain('campaign-review-factions-modal')
  })
})

describe('CampaignReview factions modal CSS (153.3)', () => {
  it('fills the content-width overlay like pantheon', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const css = readFileSync(join(__dirname, 'campaignReview.css'), 'utf8')
    expect(css).toMatch(
      /\.campaign-review-overlay--content-width\s+\.campaign-review-factions-modal[\s\S]*?\{[^}]*width:\s*100%/
    )
    expect(css).toMatch(/\.campaign-review-factions-modal\s*\{[^}]*max-height:\s*min\(90vh/s)
  })
})
