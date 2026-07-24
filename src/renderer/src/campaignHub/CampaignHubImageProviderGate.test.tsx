import { describe, expect, it } from 'vitest'
import { CampaignHubCastCard, CampaignHubCastRail } from './CampaignHubCastRail'
import { CampaignHubLayout } from './CampaignHubLayout'
import { makeTestHubSnapshot } from './hubTestFixtures'

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
  const children = details.props.children as JSX.Element[]
  const resume = children.find((child) => child?.props?.className === 'campaign-hub-resume')
  if (!resume) {
    throw new Error('expected Resume button in cast card details')
  }
  return resume
}

function hubBodyBanner(node: JSX.Element): JSX.Element | undefined {
  const body = normalizeChildren(node.props.children).find(
    (child) => child.props?.className === 'campaign-hub-body'
  )
  if (!body) {
    return undefined
  }
  return normalizeChildren(body.props.children).find(
    (child) => child.props?.className === 'campaign-hub-image-provider-banner'
  )
}

const HUB_LAYOUT_STUBS = {
  sessionRecap: { status: 'ready' as const, text: 'Previously, you held the pass.' },
  lastPlayed: 'Jun 1, 2026',
  obituaryCharacterId: null,
  worldHistoryOpen: false,
  onViewWorldHistory: () => {},
  onCloseWorldHistory: () => {},
  onResumeCharacter: () => {},
  onCreateCharacter: () => {},
  onViewObituary: () => {},
  onCloseObituary: () => {}
}

function renderGenerativeTokensHub(options: {
  actionsDisabled: boolean
  imageProviderMismatch: boolean
}): JSX.Element {
  const snapshot = makeTestHubSnapshot({
    campaign: {
      ...makeTestHubSnapshot().campaign!,
      generativeTokensEnabled: true
    }
  })
  return CampaignHubLayout({
    snapshot,
    ...HUB_LAYOUT_STUBS,
    actionsDisabled: options.actionsDisabled,
    imageProviderMismatch: options.imageProviderMismatch
  })
}

describe('CampaignHub image provider gate', () => {
  it('shows banner and disables Resume when campaign tokens ON and provider not ready', () => {
    const layoutNode = renderGenerativeTokensHub({
      actionsDisabled: true,
      imageProviderMismatch: true
    })

    const banner = hubBodyBanner(layoutNode)
    expect(banner).toBeDefined()
    expect(banner!.props.children).toBe('Campaign requires an image provider')

    const railProps = castRailProps(layoutNode)
    expect(railProps.actionsDisabled).toBe(true)
    expect(resumeButton(railProps).props.disabled).toBe(true)
  })

  it('clears mismatch when image provider is ready', () => {
    const layoutNode = renderGenerativeTokensHub({
      actionsDisabled: false,
      imageProviderMismatch: false
    })

    expect(hubBodyBanner(layoutNode)).toBeUndefined()
    const railProps = castRailProps(layoutNode)
    expect(railProps.actionsDisabled).toBe(false)
    expect(resumeButton(railProps).props.disabled).toBe(false)
  })
})
