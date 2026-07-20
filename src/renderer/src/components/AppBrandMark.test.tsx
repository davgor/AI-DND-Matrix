import { describe, expect, it } from 'vitest'
import { APP_DISPLAY_NAME } from '../../../shared/appBranding'
import { AppBrandLockup, AppBrandMark } from './AppBrandMark'

describe('AppBrandMark', () => {
  it('renders a Vite-bundled brand mark (not a root-absolute public URL)', () => {
    const node = AppBrandMark({ size: 20 })
    expect(node.type).toBe('img')
    expect(typeof node.props.src).toBe('string')
    expect(node.props.src).toMatch(/app-icon/)
    expect(node.props.src).not.toBe('/app-icon.png')
    expect(node.props.src.startsWith('/app-icon')).toBe(false)
    expect(node.props.width).toBe(20)
    expect(node.props.height).toBe(20)
    expect(node.props['aria-hidden']).toBe('true')
  })

  it('renders a lockup with mark and product name', () => {
    const node = AppBrandLockup({ markSize: 18, nameClassName: 'titlebar-app-name' })
    expect(node.props.className).toBe('app-brand-lockup')
    const [mark, name] = node.props.children as [
      ReturnType<typeof AppBrandMark>,
      { props: { children: string; className: string } }
    ]
    expect(mark.props.size).toBe(18)
    expect(name.props.className).toBe('titlebar-app-name')
    expect(name.props.children).toBe(APP_DISPLAY_NAME)
  })
})
