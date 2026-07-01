import { useEffect, useRef, type RefObject } from 'react'

export function scrollStreamItemToTop(container: HTMLElement, item: HTMLElement): void {
  container.scrollTop += item.getBoundingClientRect().top - container.getBoundingClientRect().top
}

export const STREAM_ITEM_ID_ATTR = 'data-stream-item-id'

export function streamItemSelector(itemId: string): string {
  return `[${STREAM_ITEM_ID_ATTR}="${CSS.escape(itemId)}"]`
}

export function useScrollToNewStreamItem(
  containerRef: RefObject<HTMLElement | null>,
  itemIds: readonly string[]
): void {
  const previousTailIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const tailId = itemIds[itemIds.length - 1]
    if (!tailId || tailId === previousTailIdRef.current) {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    const item = container.querySelector<HTMLElement>(streamItemSelector(tailId))
    if (!item) {
      return
    }

    scrollStreamItemToTop(container, item)
    previousTailIdRef.current = tailId
  }, [containerRef, itemIds])
}
