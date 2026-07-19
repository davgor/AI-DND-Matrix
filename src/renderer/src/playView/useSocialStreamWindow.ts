import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  initialSocialWindow,
  isNearSocialBottom,
  loadOlderSocialWindow,
  newestSocialWindow,
  shouldLoadOlderSocial,
  type SocialRenderWindow
} from './socialStreamWindow'

function clampSocialWindow(
  current: SocialRenderWindow,
  totalEntries: number
): SocialRenderWindow {
  if (current.start + current.count > totalEntries || current.start >= totalEntries) {
    return newestSocialWindow(totalEntries)
  }
  const count = Math.min(current.count, Math.max(0, totalEntries - current.start))
  return { start: current.start, count }
}

function attachSocialScrollHandler(input: {
  element: HTMLDivElement
  totalEntries: number
  pinnedRef: { current: boolean }
  loadingOlderRef: { current: boolean }
  setRenderWindow: (updater: (current: SocialRenderWindow) => SocialRenderWindow) => void
}): () => void {
  const { element, totalEntries, pinnedRef, loadingOlderRef, setRenderWindow } = input

  function handleScroll(): void {
    const nearBottom = isNearSocialBottom(
      element.scrollTop,
      element.scrollHeight,
      element.clientHeight
    )
    pinnedRef.current = nearBottom
    if (nearBottom) {
      setRenderWindow(() => newestSocialWindow(totalEntries))
      return
    }
    if (loadingOlderRef.current || !shouldLoadOlderSocial(element.scrollTop)) {
      return
    }
    setRenderWindow((current) => {
      const next = loadOlderSocialWindow(current, totalEntries)
      if (next.start === current.start && next.count === current.count) {
        return current
      }
      loadingOlderRef.current = true
      return next
    })
  }

  element.addEventListener('scroll', handleScroll)
  return () => element.removeEventListener('scroll', handleScroll)
}

export function useSocialStreamWindow(totalEntries: number): {
  scrollRef: RefObject<HTMLDivElement>
  renderWindow: SocialRenderWindow
} {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const loadingOlderRef = useRef(false)
  const [renderWindow, setRenderWindow] = useState<SocialRenderWindow>(() =>
    initialSocialWindow(totalEntries)
  )

  useEffect(() => {
    if (pinnedRef.current) {
      setRenderWindow(newestSocialWindow(totalEntries))
      return
    }
    setRenderWindow((current) => clampSocialWindow(current, totalEntries))
  }, [totalEntries])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }
    return attachSocialScrollHandler({
      element,
      totalEntries,
      pinnedRef,
      loadingOlderRef,
      setRenderWindow
    })
  }, [totalEntries])

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }
    if (loadingOlderRef.current) {
      element.scrollTop = 64
      loadingOlderRef.current = false
      return
    }
    if (pinnedRef.current) {
      element.scrollTop = element.scrollHeight
    }
  }, [totalEntries, renderWindow.start, renderWindow.count])

  return { scrollRef, renderWindow }
}
