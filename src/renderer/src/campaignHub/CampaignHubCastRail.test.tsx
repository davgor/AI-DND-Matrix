import { describe, expect, it } from 'vitest'
import { CampaignHubCastCard, CampaignHubCastRail } from './CampaignHubCastRail'
import { makeTestCastMember } from './hubTestFixtures'

function castCardFromLi(item: JSX.Element): JSX.Element {
  const cardComponent = item.props.children as JSX.Element
  return CampaignHubCastCard(cardComponent.props)
}

function cardDetails(article: JSX.Element): JSX.Element {
  return (article.props.children as JSX.Element[])[1]
}

describe('CampaignHubCastRail', () => {
  it('renders living characters with Resume and dead characters with skull prefix', () => {
    const node = CampaignHubCastRail({
      cast: [
        makeTestCastMember({ id: 'alive-1', name: 'Kael', lifeStatus: 'alive' }),
        makeTestCastMember({
          id: 'dead-1',
          name: 'Mira',
          lifeStatus: 'dead',
          hasObituary: true
        })
      ],
      actionsDisabled: false,
      onResumeCharacter: () => {},
      onCreateCharacter: () => {},
      onViewObituary: () => {}
    })

    const list = (node.props.children as JSX.Element[])[1] as JSX.Element
    const items = list.props.children as JSX.Element[]
    const aliveArticle = castCardFromLi(items[0])
    const deadArticle = castCardFromLi(items[1])

    const aliveHeading = cardDetails(aliveArticle).props.children[0]
    expect(aliveHeading.props.children).toBe('Kael')

    const deadHeading = cardDetails(deadArticle).props.children[0]
    expect(deadHeading.props.children).toBe('☠ Mira')

    const aliveButton = cardDetails(aliveArticle).props.children[3]
    expect(aliveButton.props.className).toBe('campaign-hub-resume')

    const deadButton = cardDetails(deadArticle).props.children[3]
    expect(deadButton.props.className).toBe('campaign-hub-view-obituary')
  })

  it('disables Resume and Create actions when actionsDisabled is true', () => {
    const node = CampaignHubCastRail({
      cast: [makeTestCastMember()],
      actionsDisabled: true,
      onResumeCharacter: () => {},
      onCreateCharacter: () => {},
      onViewObituary: () => {}
    })

    const list = (node.props.children as JSX.Element[])[1] as JSX.Element
    const aliveArticle = castCardFromLi(list.props.children[0] as JSX.Element)
    const resumeButton = cardDetails(aliveArticle).props.children[3]
    const createButton = (node.props.children as JSX.Element[])[2].props.children
    expect(resumeButton.props.disabled).toBe(true)
    expect(createButton.props.disabled).toBe(true)
  })
})
