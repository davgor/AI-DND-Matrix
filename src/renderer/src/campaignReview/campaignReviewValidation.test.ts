import { describe, expect, it } from 'vitest'
import { CampaignReviewFooter } from './CampaignReviewSections'

describe('CampaignReviewFooter continue validation', () => {
  it('disables continue when regions or NPCs are missing', () => {
    const blocked = CampaignReviewFooter({
      detail: { regions: [], npcs: [] },
      onGenerate: () => {},
      onContinue: () => {}
    })
    const blockedGroup = blocked.props.children[1] as JSX.Element
    const blockedButton = blockedGroup.props.children[1] as JSX.Element
    expect(blockedButton.props.disabled).toBe(true)
    expect(blockedGroup.props.children[0]).toBeTruthy()

    const allowed = CampaignReviewFooter({
      detail: {
        regions: [{ id: 'r1' } as never],
        npcs: [{ id: 'n1' } as never]
      },
      onGenerate: () => {},
      onContinue: () => {}
    })
    const allowedGroup = allowed.props.children[1] as JSX.Element
    const allowedButton = allowedGroup.props.children[1] as JSX.Element
    expect(allowedButton.props.disabled).toBe(false)
    expect(allowedGroup.props.children[0]).toBeNull()
  })
})
