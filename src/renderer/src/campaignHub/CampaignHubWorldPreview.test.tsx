import { describe, expect, it } from 'vitest'
import { EditableField } from '../campaignReview/EditableField'
import { CampaignReviewWorldContent } from '../campaignReview/CampaignReviewWorldContent'
import { CampaignReviewStory } from '../campaignReview/CampaignReviewSections'
import { CampaignReviewReadOnlyRegionCard } from '../campaignReview/CampaignReviewReadOnlyRegionCard'
import { CampaignHubWorldPreview } from './CampaignHubWorldPreview'
import { makeTestHubSnapshot } from './hubTestFixtures'

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
    const node = CampaignHubWorldPreview({ snapshot })

    expect(node.props.className).toBe('campaign-hub-world-preview')
    expect(
      normalizeChildren(node.props.children).some((child) => child.type === CampaignReviewWorldContent)
    ).toBe(true)
    expect(sectionByClass(node, 'campaign-hub-current-state')).toBeDefined()
    expect(sectionByClass(node, 'campaign-hub-recent-events')).toBeDefined()

    const story = normalizeChildren(node.props.children).find((child) => child.type === CampaignReviewStory)
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

  it('renders recent events from the hub snapshot', () => {
    const snapshot = makeTestHubSnapshot({
      recentEvents: [
        {
          id: 'evt-2',
          type: 'combat',
          createdAt: '2026-06-02T08:00:00.000Z',
          summary: 'A skirmish broke out at the gate.'
        }
      ]
    })
    const node = CampaignHubWorldPreview({ snapshot })
    const recent = sectionByClass(node, 'campaign-hub-recent-events')!
    const listItem = normalizeChildren(normalizeChildren(recent.props.children)[1].props.children)[0]
    expect(listItem.props.children[2]).toBe('A skirmish broke out at the gate.')
  })
})
