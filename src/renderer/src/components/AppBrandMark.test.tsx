import { describe, expect, it } from 'vitest'
import { APP_BRAND_MARK_SRC, APP_DISPLAY_NAME } from '../../../shared/appBranding'
import { AppBrandLockup, AppBrandMark } from './AppBrandMark'

describe('AppBrandMark', () => {
  it('renders the shield brand mark image', () => {
    const node = AppBrandMark({ size: 20 })
    expect(node.type).toBe('img')
    expect(node.props.src).toBe(APP_BRAND_MARK_SRC)
    expect(node.props.width).toBe(20)
    expect(node.props.height).toBe(20)
    expect(node.props['aria-hidden']).toBe('true')
  })

  it('renders a lockup with mark and product name', () => {
    const node = AppBrandLockup({ markSize: 18, nameClassName: 'titlebar-app-name' })
    expect(node.props.className).toBe('app-brand-lockup')
    const [mark, name] = node.props.children as [ReturnType<typeof AppBrandMark>, { props: { children: string; className: string } }]
    expect(mark.props.size).toBe(18)
    expect(name.props.className).toBe('titlebar-app-name')
    expect(name.props.children).toBe(APP_DISPLAY_NAME)
  })
})
