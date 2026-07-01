import { describe, expect, it } from 'vitest'
import { scrollStreamItemToTop } from './scrollStreamItem'

function mockRect(top: number, height = 20): DOMRect {
  return { top, height } as DOMRect
}

describe('scrollStreamItemToTop', () => {
  it('aligns the item top with the container top', () => {
    const container = {
      scrollTop: 40,
      getBoundingClientRect: () => mockRect(100)
    } as HTMLElement
    const item = {
      getBoundingClientRect: () => mockRect(160)
    } as HTMLElement

    scrollStreamItemToTop(container, item)

    expect(container.scrollTop).toBe(100)
  })
})
