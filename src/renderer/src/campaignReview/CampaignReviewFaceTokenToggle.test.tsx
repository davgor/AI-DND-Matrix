import { describe, expect, it, vi } from 'vitest'
import { CampaignReviewFaceTokenToggle } from './CampaignReviewFaceTokenToggle'

describe('CampaignReviewFaceTokenToggle', () => {
  it('renders unchecked by default copy and fires onChange', () => {
    const onChange = vi.fn()
    const tree = CampaignReviewFaceTokenToggle({ enabled: false, onChange })
    expect(tree.props.className).toBe('campaign-review-face-token-toggle')
    const input = tree.props.children[0] as JSX.Element
    expect(input.props.checked).toBe(false)
    input.props.onChange({ target: { checked: true } })
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
