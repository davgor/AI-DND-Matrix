import { describe, expect, it, vi } from 'vitest'
import { CampaignReviewEnemyTokenToggle } from './CampaignReviewEnemyTokenToggle'

describe('CampaignReviewEnemyTokenToggle', () => {
  it('renders unchecked by default copy and fires onChange', () => {
    const onChange = vi.fn()
    const tree = CampaignReviewEnemyTokenToggle({ enabled: false, onChange })
    expect(tree.props.className).toBe('campaign-review-enemy-token-toggle')
    const input = tree.props.children[0] as JSX.Element
    expect(input.props.checked).toBe(false)
    input.props.onChange({ target: { checked: true } })
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
