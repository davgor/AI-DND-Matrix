import { describe, expect, it } from 'vitest'
import { CampaignHubCastRail } from './CampaignHubCastRail'
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

describe('CampaignHub layout shell', () => {
  it('renders sidebar, center, and cast rail regions', () => {
    const snapshot = makeTestHubSnapshot()
    const node = CampaignHubLayout({
      snapshot,
      lastPlayed: 'Jun 1, 2026',
      sidebar: <nav className="test-sidebar">Sidebar</nav>,
      actionsDisabled: false,
      obituaryCharacterId: null,
      onResumeCharacter: () => {},
      onCreateCharacter: () => {},
      onViewObituary: () => {},
      onCloseObituary: () => {}
    })

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
    const node = CampaignHubLayout({
      snapshot,
      lastPlayed: 'Jun 1, 2026',
      actionsDisabled: false,
      obituaryCharacterId: null,
      onResumeCharacter: () => {},
      onCreateCharacter: () => {},
      onViewObituary: () => {},
      onCloseObituary: () => {}
    })

    const center = childByClass(childByClass(node, 'campaign-hub-body')!, 'campaign-hub-center')!
    const header = childByClass(center, 'campaign-hub-header')!
    const headerChildren = normalizeChildren(header.props.children)
    expect((headerChildren[0] as JSX.Element).props.children).toBe('Iron Marches')
    expect((headerChildren[1] as JSX.Element).props.className).toBe('campaign-hub-premise')
    expect((headerChildren[2] as JSX.Element).props.children).toEqual(['Last played: ', 'Jun 1, 2026'])
  })
})
