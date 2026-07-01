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

    function handleScroll(): void {
      const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
      pinnedRef.current = distanceFromBottom < 48
    }

    element.addEventListener('scroll', handleScroll)
    return () => element.removeEventListener('scroll', handleScroll)
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
