/** Max Social messages rendered at once (newest window by default). */
export const SOCIAL_WINDOW_SIZE = 100

/** How far toward older history to shift when the user scrolls near the top. */
export const SOCIAL_WINDOW_CHUNK = 100

export interface SocialRenderWindow {
  /** Inclusive start index into the full social entry list. */
  start: number
  /** Number of entries to render (≤ SOCIAL_WINDOW_SIZE). */
  count: number
}

export function initialSocialWindow(
  total: number,
  size: number = SOCIAL_WINDOW_SIZE
): SocialRenderWindow {
  if (total <= 0) {
    return { start: 0, count: 0 }
  }
  const count = Math.min(size, total)
  return { start: total - count, count }
}

/** Shift the window toward older messages without exceeding size. */
export function loadOlderSocialWindow(
  current: SocialRenderWindow,
  total: number,
  chunk: number = SOCIAL_WINDOW_CHUNK,
  size: number = SOCIAL_WINDOW_SIZE
): SocialRenderWindow {
  if (total <= 0 || current.start <= 0) {
    return initialSocialWindow(total, size)
  }
  const start = Math.max(0, current.start - chunk)
  const count = Math.min(size, total - start)
  return { start, count }
}

/** Snap back to the newest messages (e.g. when pinned to the bottom). */
export function newestSocialWindow(
  total: number,
  size: number = SOCIAL_WINDOW_SIZE
): SocialRenderWindow {
  return initialSocialWindow(total, size)
}

export function sliceSocialWindow<T>(
  entries: readonly T[],
  window: SocialRenderWindow
): T[] {
  if (window.count <= 0 || entries.length === 0) {
    return []
  }
  return entries.slice(window.start, window.start + window.count)
}

export function shouldLoadOlderSocial(scrollTop: number, threshold = 48): boolean {
  return scrollTop <= threshold
}

export function isNearSocialBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  threshold = 48
): boolean {
  return scrollHeight - scrollTop - clientHeight < threshold
}

export function scrollTopAfterPrepend(
  previousScrollHeight: number,
  previousScrollTop: number,
  nextScrollHeight: number
): number {
  return nextScrollHeight - previousScrollHeight + previousScrollTop
}
