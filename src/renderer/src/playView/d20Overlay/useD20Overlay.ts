import { useEffect, useRef, useState } from 'react'
import {
  D20_OVERLAY_REDUCED_MOTION_MS,
  checkIdentityKey,
  observeLiveCheck,
  shouldPersistSettledFaceLabel,
  totalOverlayDurationMs,
  type CheckSnapshot,
  type D20OverlayObserveState
} from './d20OverlayLogic'

type D20OverlayPlayback = {
  active: boolean
  face: number | null
  playKey: number
  persistFaceLabel: boolean
  durationMs: number
  reducedMotion: boolean
}

type ScheduleFn = (handler: () => void, ms: number) => ReturnType<typeof setTimeout>
type CancelFn = (id: ReturnType<typeof setTimeout>) => void

function defaultSchedule(handler: () => void, ms: number): ReturnType<typeof setTimeout> {
  return globalThis.setTimeout(handler, ms)
}

function defaultCancel(id: ReturnType<typeof setTimeout>): void {
  globalThis.clearTimeout(id)
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function startPlayback(
  face: number,
  showRolls: boolean,
  playKey: number
): D20OverlayPlayback {
  const reduced = prefersReducedMotion()
  return {
    active: true,
    face,
    playKey,
    persistFaceLabel: shouldPersistSettledFaceLabel(showRolls),
    durationMs: reduced ? D20_OVERLAY_REDUCED_MOTION_MS : totalOverlayDurationMs(),
    reducedMotion: reduced
  }
}

/**
 * Watches live `lastCheck` updates and drives a single replaceable overlay play.
 * First observation seeds without animating (no hydrate flash).
 */
export function useD20Overlay(
  lastCheck: CheckSnapshot,
  showRolls: boolean,
  schedule: ScheduleFn = defaultSchedule,
  cancel: CancelFn = defaultCancel
): D20OverlayPlayback {
  const [playback, setPlayback] = useState<D20OverlayPlayback>({
    active: false,
    face: null,
    playKey: 0,
    persistFaceLabel: shouldPersistSettledFaceLabel(showRolls),
    durationMs: totalOverlayDurationMs(),
    reducedMotion: false
  })
  const stateRef = useRef<D20OverlayObserveState>({ seen: false, previousKey: null })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playKeyRef = useRef(0)
  const checkKey = checkIdentityKey(lastCheck)
  const checkRef = useRef(lastCheck)
  checkRef.current = lastCheck

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        cancel(timerRef.current)
        timerRef.current = null
      }
    }
  }, [cancel])

  useEffect(() => {
    const result = observeLiveCheck(stateRef.current, checkRef.current)
    stateRef.current = result.next
    if (!result.shouldAnimate || result.face === null) {
      return
    }
    if (timerRef.current !== null) {
      cancel(timerRef.current)
    }
    playKeyRef.current += 1
    const next = startPlayback(result.face, showRolls, playKeyRef.current)
    setPlayback(next)
    timerRef.current = schedule(() => {
      timerRef.current = null
      setPlayback((prev) => ({ ...prev, active: false }))
    }, next.durationMs)
  }, [checkKey, showRolls, schedule, cancel])

  return playback
}
