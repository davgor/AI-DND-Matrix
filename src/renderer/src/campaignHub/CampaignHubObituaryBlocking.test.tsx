import { describe, expect, it } from 'vitest'
import { CampaignHubCastCard, CampaignHubCastRail } from './CampaignHubCastRail'
import { CampaignHubLayout } from './CampaignHubLayout'
import { CampaignHubModals } from './CampaignHubLayoutParts'
import { CampaignHubObituaryModal } from './CampaignHubObituaryModal'
import { makeTestCastMember, makeTestHubSnapshot } from './hubTestFixtures'

function castRailProps(node: JSX.Element) {
  const children = normalizeChildren(node.props.children)
  const body = children.find((child) => child.props?.className === 'campaign-hub-body')!
  const rail = normalizeChildren(body.props.children).find((child) => child.type === CampaignHubCastRail)!
  return rail.props as Parameters<typeof CampaignHubCastRail>[0]
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

function resumeButton(props: Parameters<typeof CampaignHubCastRail>[0]): JSX.Element {
  const rendered = CampaignHubCastRail(props)
  const list = (rendered.props.children as JSX.Element[])[1] as JSX.Element
  const cardComponent = (list.props.children[0] as JSX.Element).props.children as JSX.Element
  const article = CampaignHubCastCard(cardComponent.props)
  const details = (article.props.children as JSX.Element[])[1]
  return details.props.children[3] as JSX.Element
}

function createButton(props: Parameters<typeof CampaignHubCastRail>[0]): JSX.Element {
  const rendered = CampaignHubCastRail(props)
  const footer = (rendered.props.children as JSX.Element[])[2]
  return footer.props.children as JSX.Element
}

describe('CampaignHub obituary blocking', () => {
  it('disables Resume and Create while the obituary modal is open', () => {
    const snapshot = makeTestHubSnapshot({
      cast: [
        makeTestCastMember({ id: 'alive-1', lifeStatus: 'alive' }),
        makeTestCastMember({ id: 'dead-1', lifeStatus: 'dead', name: 'Mira' })
      ]
    })

    const node = CampaignHubLayout({
      snapshot,
      sessionRecap: { status: 'ready', text: 'Previously, you held the pass.' },
      lastPlayed: 'Jun 1, 2026',
      actionsDisabled: true,
      obituaryCharacterId: 'dead-1',
      worldHistoryOpen: false,
      onViewWorldHistory: () => {},
      onCloseWorldHistory: () => {},
      onResumeCharacter: () => {},
      onCreateCharacter: () => {},
      onViewObituary: () => {},
      onCloseObituary: () => {}
    })

    const railProps = castRailProps(node)
    expect(railProps.actionsDisabled).toBe(true)
    expect(resumeButton(railProps).props.disabled).toBe(true)
    expect(createButton(railProps).props.disabled).toBe(true)

    const modalsNode = normalizeChildren(node.props.children).find((child) => child.type === CampaignHubModals)!
    const modals = CampaignHubModals(modalsNode.props)
    const modalComponent = normalizeChildren(modals.props.children).find(
      (child) => child.type === CampaignHubObituaryModal
    )
    expect(modalComponent).toBeDefined()
    const renderedModal = CampaignHubObituaryModal(modalComponent!.props)
    expect(renderedModal?.props.className).toBe('campaign-hub-obituary-backdrop')
  })
})
