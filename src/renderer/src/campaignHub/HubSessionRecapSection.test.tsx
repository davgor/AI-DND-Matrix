import { describe, expect, it } from 'vitest'
import { FormattedText } from '../shared/FormattedText'
import { HubSessionRecapSection } from './HubSessionRecapSection'

function normalizeChildren(children: unknown): JSX.Element[] {
  if (children === undefined || children === null) {
    return []
  }
  if (Array.isArray(children)) {
    return children.flatMap((child) => {
      if (child === null || child === undefined || typeof child === 'boolean') {
        return []
      }
      if (typeof child === 'string' || typeof child === 'number') {
        return []
      }
      return [child as JSX.Element]
    })
  }
  return [children as JSX.Element]
}

describe('HubSessionRecapSection', () => {
  it('shows Session recap title and loading affordance while generating', () => {
    const node = HubSessionRecapSection({ recap: { status: 'loading' } })
    expect(node.props.className).toContain('campaign-hub-session-recap')
    const children = normalizeChildren(node.props.children)
    expect(children[0]?.props.children).toBe('Session recap')
    expect(children[1]?.props.className).toContain('campaign-hub-session-recap-loading')
    expect(children[1]?.props.children).toContain('Loading')
  })

  it('renders ready text via FormattedText', () => {
    const node = HubSessionRecapSection({
      recap: { status: 'ready', text: 'Previously, you crossed the bridge.' }
    })
    const children = normalizeChildren(node.props.children)
    const body = children[1]
    expect(body?.type).toBe(FormattedText)
    expect(body?.props.text).toBe('Previously, you crossed the bridge.')
  })

  it('renders empty-events copy when ready with start-of-story text', () => {
    const empty = 'This is the start of your story — nothing has happened yet.'
    const node = HubSessionRecapSection({ recap: { status: 'ready', text: empty } })
    const children = normalizeChildren(node.props.children)
    expect(children[1]?.props.text).toBe(empty)
  })
})
