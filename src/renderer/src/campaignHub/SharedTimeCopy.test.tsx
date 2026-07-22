import { describe, expect, it } from 'vitest'
import { CampaignHubCastCard } from './CampaignHubCastRail'
import { CampaignHubHeader } from './CampaignHubLayoutParts'
import { makeTestCampaign, makeTestCastMember } from './hubTestFixtures'
import { formatAwayBlurb, formatLastActiveLabel, formatWorldDayLabel } from '../../../shared/sharedTime'

// EPIC-133 — hub shared-time copy / away blurb
describe('CampaignHubHeader shared-time copy (133.4)', () => {
  it('shows world day from the shared campaign clock', () => {
    const header = CampaignHubHeader({
      campaign: makeTestCampaign({ inGameDate: 12 }),
      lastPlayed: 'Jun 1, 2026'
    })
    const children = header.props.children as JSX.Element[]
    const worldDay = children.find(
      (child) => child?.props?.className === 'campaign-hub-world-day'
    )
    expect(worldDay).toBeDefined()
    expect(worldDay!.props.children).toBe(formatWorldDayLabel(12))
  })
})

function flattenCastDetailElements(node: unknown): JSX.Element[] {
  if (node === null || node === undefined || node === false) {
    return []
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => flattenCastDetailElements(child))
  }
  const element = node as JSX.Element
  if (typeof element.type === 'function') {
    return flattenCastDetailElements(element.type(element.props))
  }
  if (element.props?.children !== undefined && !element.props?.className) {
    return flattenCastDetailElements(element.props.children)
  }
  return [element]
}

function castCardDetailChildren(member: ReturnType<typeof makeTestCastMember>): JSX.Element[] {
  const article = CampaignHubCastCard({
    member,
    actionsDisabled: false,
    onResumeCharacter: () => {},
    onViewObituary: () => {}
  })
  const details = (article.props.children as JSX.Element[])[1]
  return flattenCastDetailElements(details.props.children)
}

describe('CampaignHubCastCard shared-time copy (133.4)', () => {
  it('shows last-active day and empty away blurb when synced', () => {
    const children = castCardDetailChildren(
      makeTestCastMember({
        lastActiveInGameDate: 12,
        awayBlurb: formatAwayBlurb(12, 12)
      })
    )
    const lastActive = children.find(
      (child) => child?.props?.className === 'campaign-hub-cast-last-active'
    )
    const away = children.find((child) => child?.props?.className === 'campaign-hub-cast-away')
    expect(lastActive?.props.children).toBe(formatLastActiveLabel(12))
    expect(away).toBeUndefined()
  })

  it('shows away blurb when the cast member lagged the shared clock', () => {
    const blurb = formatAwayBlurb(15, 12)
    expect(blurb.length).toBeGreaterThan(0)
    const children = castCardDetailChildren(
      makeTestCastMember({
        lastActiveInGameDate: 12,
        awayBlurb: blurb
      })
    )
    const away = children.find((child) => child?.props?.className === 'campaign-hub-cast-away')
    expect(away?.props.children).toBe(blurb)
    expect(String(away?.props.children).toLowerCase()).toContain('shared')
  })
})
