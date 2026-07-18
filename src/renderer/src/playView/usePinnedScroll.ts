import { useEffect, useRef, type RefObject } from 'react'

export function usePinnedScroll<T extends HTMLElement>(entryCount: number): {
  scrollRef: RefObject<T>
} {
  const scrollRef = useRef<T>(null)
  const pinnedRef = useRef(true)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }
    const target = element

    function handleScroll(): void {
      const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight
      pinnedRef.current = distanceFromBottom < 48
    }

    target.addEventListener('scroll', handleScroll)
    return () => target.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element || !pinnedRef.current) {
      return
    }
    element.scrollTop = element.scrollHeight
  }, [entryCount])

  return { scrollRef }
}
