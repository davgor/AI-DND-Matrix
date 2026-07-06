import { describe, expect, it } from 'vitest'
import { CampaignReviewWorldContent } from './CampaignReviewWorldContent'

function collectText(node: unknown): string {
  if (typeof node === 'string') {
    return node
  }
  if (typeof node !== 'object' || node === null || !('props' in node)) {
    return ''
  }
  const children = (node as JSX.Element).props.children
  if (children === undefined) {
    return ''
  }
  if (Array.isArray(children)) {
    return children.map((child) => collectText(child)).join(' ')
  }
  return collectText(children)
}

describe('CampaignReviewWorldContent', () => {
  it('renders world summary and optional view button', () => {
    const tree = CampaignReviewWorldContent({
      worldName: 'Velmora',
      worldSummary: 'Para one.\n\nTwo.\n\nThree.',
      onViewHistory: () => {}
    })
    const text = collectText(tree)
    expect(text).toContain('Velmora')
    expect(text).toContain('View full history')
  })
})
