import { describe, expect, it, vi } from 'vitest'
import { CampaignReviewGenerativeTokensToggle } from './CampaignReviewGenerativeTokensToggle'

describe('CampaignReviewGenerativeTokensToggle', () => {
  it('renders unchecked by default copy and fires onChange', () => {
    const onChange = vi.fn()
    const tree = CampaignReviewGenerativeTokensToggle({ enabled: false, onChange })
    expect(tree.props.className).toBe('campaign-review-generative-tokens-toggle')
    const input = tree.props.children[0] as JSX.Element
    expect(input.props.checked).toBe(false)
    input.props.onChange({ target: { checked: true } })
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
