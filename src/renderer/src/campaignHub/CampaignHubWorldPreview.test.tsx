import { describe, expect, it } from 'vitest'
import { EditableField } from '../campaignReview/EditableField'
import { CampaignReviewWorldContent } from '../campaignReview/CampaignReviewWorldContent'
import { CampaignReviewStory } from '../campaignReview/CampaignReviewSections'
import { CampaignReviewFactionsSection } from '../campaignReview/CampaignReviewFactionsSection'
import { CampaignReviewReadOnlyRegionCard } from '../campaignReview/CampaignReviewReadOnlyRegionCard'
import { CampaignHubWorldPreview } from './CampaignHubWorldPreview'
import { HubSessionRecapSection } from './HubSessionRecapSection'
import { makeTestHubSnapshot, makeTestRegion } from './hubTestFixtures'
import type { Faction } from '../../../shared/factions'

function sectionByClass(node: JSX.Element | undefined, className: string): JSX.Element | undefined {
  if (!node?.props) {
    return undefined
  }
  if (node.props.className?.includes(className)) {
    return node
  }
  if (typeof node.type === 'function') {
    const rendered = (node.type as (props: Record<string, unknown>) => JSX.Element)(node.props)
    return sectionByClass(rendered, className)
  }
  for (const child of normalizeChildren(node.props.children)) {
    const found = sectionByClass(child, className)
    if (found) {
      return found
    }
  }
  return undefined
}

function normalizeChildren(children: unknown): JSX.Element[] {
  if (children === undefined || children === null) {
    return []
  }
  if (Array.isArray(children)) {
    return children.flatMap((child) => {
      if (child === null || child === undefined || typeof child === 'boolean') {
        return []
      }
      if (typeof child === 'string' || typeof child === 'number') {
        return []
      }
      return [child as JSX.Element]
    })
  }
  return [children as JSX.Element]
}

function findByType(node: JSX.Element, type: unknown): JSX.Element | undefined {
  if (node.type === type) {
    return node
  }
  if (typeof node.type === 'function') {
    const rendered = (node.type as (props: Record<string, unknown>) => JSX.Element | null)(node.props)
    if (rendered && typeof rendered === 'object' && 'type' in rendered) {
      return findByType(rendered, type)
    }
    return undefined
  }
  for (const child of normalizeChildren(node.props?.children)) {
    const found = findByType(child, type)
    if (found) {
      return found
    }
  }
  return undefined
}

describe('CampaignHubWorldPreview', () => {
  it('renders read-only world content without editable fields', () => {
    const snapshot = makeTestHubSnapshot()
    const node = CampaignHubWorldPreview({
      snapshot,
      sessionRecap: { status: 'ready', text: 'Previously, you held the pass.' }
    })

    expect(node.props.className).toBe('campaign-hub-world-preview')
    expect(findByType(node, CampaignReviewWorldContent)).toBeDefined()
    expect(sectionByClass(node, 'campaign-hub-current-state')).toBeDefined()
    expect(findByType(node, HubSessionRecapSection)).toBeDefined()

    const story = findByType(node, CampaignReviewStory)
    expect(story?.props.playAware).toBe(true)

    const regions = sectionByClass(node, 'campaign-hub-regions')!
    expect(normalizeChildren(regions.props.children).length).toBeGreaterThan(1)

    const readOnlyCard = CampaignReviewReadOnlyRegionCard({
      region: snapshot.regions[0],
      extras: snapshot.regionExtras[0],
      npcs: []
    })
    expect(findByType(readOnlyCard, EditableField)).toBeUndefined()
  })

  it('renders destroyed banner from structured region status (130.5)', () => {
    const snapshot = makeTestHubSnapshot({
      regions: [makeTestRegion({ status: { destroyed: true, cause: 'siege' } })]
    })
    const card = CampaignReviewReadOnlyRegionCard({
      region: snapshot.regions[0]!,
      extras: snapshot.regionExtras[0],
      npcs: []
    })
    const banner = sectionByClass(card, 'campaign-review-region-destroyed')
    expect(banner).toBeDefined()
    expect(JSON.stringify(banner?.props?.children)).toContain('destroyed')
    expect(JSON.stringify(banner?.props?.children)).toContain('siege')
  })

  it('passes session recap state into HubSessionRecapSection (not Recent events)', () => {
    const snapshot = makeTestHubSnapshot()
    const node = CampaignHubWorldPreview({
      snapshot,
      sessionRecap: { status: 'loading' }
    })
    const recap = findByType(node, HubSessionRecapSection)!
    expect(recap.props.recap).toEqual({ status: 'loading' })
    expect(sectionByClass(node, 'campaign-hub-recent-events')).toBeUndefined()
  })
})

describe('CampaignHubWorldPreview factions', () => {
  it('renders factions read-only when roster is present and hides when empty', () => {
    const emptySnapshot = makeTestHubSnapshot()
    const empty = CampaignHubWorldPreview({
      snapshot: emptySnapshot,
      sessionRecap: { status: 'ready', text: 'Previously.' }
    })
    const emptySection = findByType(empty, CampaignReviewFactionsSection)!
    expect(emptySection.props.readOnly).toBe(true)
    expect(CampaignReviewFactionsSection(emptySection.props)).toBeNull()

    const faction: Faction = {
      id: 'f1',
      campaignId: 'camp-1',
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
      source: 'campaign_create'
    }
    const populated = CampaignHubWorldPreview({
      snapshot: makeTestHubSnapshot({
        campaign: emptySnapshot.campaign
          ? {
              ...emptySnapshot.campaign,
              factionsSummary: 'Courts keep score.',
              factionPressure: 'medium'
            }
          : undefined,
        factions: [faction],
        factionRelations: []
      }),
      sessionRecap: { status: 'ready', text: 'Previously.' }
    })
    const section = findByType(populated, CampaignReviewFactionsSection)!
    expect(section.props.readOnly).toBe(true)
    expect(section.props.factions).toHaveLength(1)
    expect(findByType(CampaignReviewFactionsSection(section.props)!, EditableField)).toBeUndefined()
  })
})
