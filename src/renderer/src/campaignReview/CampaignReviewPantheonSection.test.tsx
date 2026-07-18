import { describe, expect, it } from 'vitest'
import type { Deity } from '../../../db/repositories/deities'
import { CampaignReviewPantheonModal } from './CampaignReviewPantheonModal'
import { shouldShowPantheonSection } from './CampaignReviewPantheonSection'

function makeDeity(overrides: Partial<Deity> = {}): Deity {
  return {
    id: 'd1',
    campaignId: 'c1',
    name: 'Vhalor',
    epithet: 'the Drowned Judge',
    domains: ['death', 'tides'],
    tenets: ['Keep every oath', 'Bury nothing the sea can claim'],
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

describe('shouldShowPantheonSection', () => {
  it('hides legacy empty pantheons and shows when summary or deities exist', () => {
    expect(shouldShowPantheonSection('', [])).toBe(false)
    expect(shouldShowPantheonSection('Gods remain.', [])).toBe(true)
    expect(shouldShowPantheonSection('', [makeDeity()])).toBe(true)
  })
})

describe('CampaignReviewPantheonModal', () => {
  it('lists deities with forgotten tag only for forgotten gods', () => {
    const tree = CampaignReviewPantheonModal({
      deities: [
        makeDeity(),
        makeDeity({ id: 'd2', name: 'Sereth', epithet: 'the Hollow Flame', isForgotten: true })
      ],
      onClose: () => undefined
    })
    const text = collectText(tree)
    expect(text).toContain('Vhalor, the Drowned Judge')
    expect(text).toContain('Sereth, the Hollow Flame')
    expect(text).toContain('Forgotten')
    expect(text).toContain('Domains:')
    expect(text).toContain('Keep every oath')
  })
})
