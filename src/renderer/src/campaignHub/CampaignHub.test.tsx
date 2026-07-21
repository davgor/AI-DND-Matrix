import { describe, expect, it } from 'vitest'
import { CampaignHubCastRail } from './CampaignHubCastRail'
import { CampaignHubHeader } from './CampaignHubLayoutParts'
import { CampaignHubLayout } from './CampaignHubLayout'
import { makeTestHubSnapshot } from './hubTestFixtures'

function childByClass(node: JSX.Element, className: string): JSX.Element | undefined {
  const children = normalizeChildren(node.props.children)
  return children.find((child) => child.props?.className === className)
}

function normalizeChildren(children: unknown): JSX.Element[] {
  if (children === undefined || children === null) {
    return []
  }
  if (Array.isArray(children)) {
    return children.filter(Boolean) as JSX.Element[]
  }
  return [children as JSX.Element]
}

function layoutProps(overrides: Partial<Parameters<typeof CampaignHubLayout>[0]> = {}) {
  return {
    snapshot: makeTestHubSnapshot(),
    sessionRecap: { status: 'ready' as const, text: 'Previously, you held the pass.' },
    lastPlayed: 'Jun 1, 2026',
    actionsDisabled: false,
    obituaryCharacterId: null,
    worldHistoryOpen: false,
    onViewWorldHistory: () => {},
    onCloseWorldHistory: () => {},
    onResumeCharacter: () => {},
    onCreateCharacter: () => {},
    onViewObituary: () => {},
    onCloseObituary: () => {},
    ...overrides
  }
}

describe('CampaignHub layout shell', () => {
  it('renders sidebar, center, and cast rail regions', () => {
    const snapshot = makeTestHubSnapshot()
    const node = CampaignHubLayout(
      layoutProps({
        snapshot,
        sidebar: <nav className="test-sidebar">Sidebar</nav>
      })
    )

    expect(node.props.className).toBe('campaign-hub')
    expect(childByClass(node, 'campaign-hub-sidebar')).toBeDefined()
    const body = childByClass(node, 'campaign-hub-body')
    expect(body).toBeDefined()
    const bodyChildren = normalizeChildren(body!.props.children)
    expect(childByClass(body!, 'campaign-hub-center')).toBeDefined()
    expect(bodyChildren[1]?.type).toBe(CampaignHubCastRail)
  })

  it('shows campaign name, premise snippet, and last-played in the header', () => {
    const snapshot = makeTestHubSnapshot({
      campaign: {
        ...makeTestHubSnapshot().campaign!,
        name: 'Iron Marches',
        premisePrompt: 'Mercenaries carve out a life on a war-torn frontier.'
      }
    })
    const node = CampaignHubLayout(layoutProps({ snapshot }))

    const center = childByClass(childByClass(node, 'campaign-hub-body')!, 'campaign-hub-center')!
    const headerNode = normalizeChildren(center.props.children).find((child) => child.type === CampaignHubHeader)!
    const header = CampaignHubHeader(headerNode.props)
    const headerChildren = normalizeChildren(header.props.children)
    expect((headerChildren[0] as JSX.Element).props.children).toBe('Iron Marches')
    expect((headerChildren[1] as JSX.Element).props.className).toBe('campaign-hub-premise')
    expect((headerChildren[2] as JSX.Element).props.children).toEqual(['Last played: ', 'Jun 1, 2026'])
  })
})
