import { describe, expect, it } from 'vitest'
import { CampaignHubObituaryModal } from './CampaignHubObituaryModal'
import { makeTestCastMember } from './hubTestFixtures'

describe('CampaignHubObituaryModal', () => {
  it('displays narrative, death cause, and NPC reactions', () => {
    const member = makeTestCastMember({
      id: 'dead-1',
      name: 'Mira',
      lifeStatus: 'dead',
      hasObituary: true,
      obituary: {
        generatedAt: '2026-06-01T00:00:00.000Z',
        deathCause: 'Fallen in battle',
        narrativeBody: 'She held the line until dawn.',
        npcReactions: [
          {
            npcId: 'npc-1',
            npcName: 'Eldon',
            tone: 'positive',
            reaction: 'She will be remembered.'
          }
        ]
      }
    })

    const node = CampaignHubObituaryModal({ member, onClose: () => {} })!
    const modal = node.props.children as JSX.Element
    const body = modal.props.children[1] as JSX.Element
    const causeParagraph = body.props.children[0] as JSX.Element
    const causeChildren = causeParagraph.props.children as Array<string | JSX.Element>
    expect(causeChildren[2]).toBe('Fallen in battle')

    const reactions = body.props.children[2] as JSX.Element
    const reactionLine = reactions.props.children[1].props.children[0]
    expect(reactionLine.props.children[0].props.children).toBe('Eldon')
  })

  it('shows an empty state when obituary data is missing', () => {
    const member = makeTestCastMember({
      lifeStatus: 'dead',
      hasObituary: false,
      obituary: undefined
    })
    const node = CampaignHubObituaryModal({ member, onClose: () => {} })!
    const modal = node.props.children as JSX.Element
    const empty = modal.props.children[1] as JSX.Element
    expect(empty.props.className).toBe('campaign-hub-obituary-empty')
  })
})
