import { describe, expect, it } from 'vitest'
import type { Faction, FactionRelation } from '../../../shared/factions'
import type { Deity } from '../../../db/repositories/deities'
import {
  CampaignReviewFactionsSection,
  formatFactionRelationReadout,
  shouldShowFactionsSection
} from './CampaignReviewFactionsSection'

function makeFaction(overrides: Partial<Faction> = {}): Faction {
  return {
    id: 'f1',
    campaignId: 'c1',
    key: 'harbor-watch',
    name: 'Harbor Watch',
    kind: 'civic',
    summary: 'Keeps the docks orderly.',
    motivation: null,
    publicFace: null,
    methods: null,
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
    summary: null,
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
  const expanded = expandNode(node)
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

describe('CampaignReviewFactionsSection light', () => {
  it('renders pressure and roster without deity labels', () => {
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
      relations: [],
      deities: [],
      readOnly: true
    })
    expect(tree).not.toBeNull()
    const text = collectText(tree)
    expect(text).toContain('Factions')
    expect(text).toContain('light')
    expect(text).toContain('Harbor Watch')
    expect(text).toContain('civic')
    expect(text).toContain('Traders’ Circle')
    expect(text).toContain('mercantile')
    expect(text).not.toContain('deity')
  })
})

describe('CampaignReviewFactionsSection heavy', () => {
  it('renders deity labels and relation readout', () => {
    const tree = CampaignReviewFactionsSection({
      factionsSummary: 'Temples and courts trade knives in the open.',
      factionPressure: 'heavy',
      factions: [
        makeFaction({ id: 'f1', key: 'ash-court', name: 'Ash Court', kind: 'political' }),
        makeFaction({
          id: 'f2',
          key: 'tide-temple',
          name: 'Tide Temple',
          kind: 'religious',
          deityId: 'd1',
          sortOrder: 1
        }),
        makeFaction({
          id: 'f3',
          key: 'night-ledger',
          name: 'Night Ledger',
          kind: 'criminal',
          sortOrder: 2
        })
      ],
      relations: [
        makeRelation({ factionAId: 'f1', factionBId: 'f2', stance: 'tense' }),
        makeRelation({ id: 'rel-2', factionAId: 'f2', factionBId: 'f3', stance: 'secret' })
      ],
      deities: [makeDeity()],
      readOnly: true
    })
    expect(tree).not.toBeNull()
    const text = collectText(tree)
    expect(text).toContain('heavy')
    expect(text).toContain('Tide Temple')
    expect(text).toContain('religious')
    expect(text).toContain('Vhalor')
    expect(text).toContain('Ash Court ↔ Tide Temple: tense')
    expect(text).toContain('Tide Temple ↔ Night Ledger: secret')
  })
})
