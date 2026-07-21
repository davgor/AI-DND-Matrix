import { useEffect, useRef, useState } from 'react'
import {
  filterEligibleNewIds,
  HighlightTimer,
  IdHighlightTracker,
  INCOMING_HIGHLIGHT_DURATION_MS,
  observeIncomingIds,
  observeIncomingValue,
  type IncomingValueState
} from './incomingHighlightLogic'
import './incomingHighlight.css'

/** True while the watched key/value should show the incoming-highlight glow. */
export function useIncomingHighlight(watchKey: string): boolean {
  const [active, setActive] = useState(false)
  const stateRef = useRef<IncomingValueState>({ seen: false, previous: '' })
  const timerRef = useRef<HighlightTimer | null>(null)

  useEffect(() => {
    const timer = new HighlightTimer(INCOMING_HIGHLIGHT_DURATION_MS, setActive)
    timerRef.current = timer
    return () => {
      timer.dispose()
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    const result = observeIncomingValue(stateRef.current, watchKey)
    stateRef.current = result.next
    if (result.shouldStartHighlight) {
      timerRef.current?.restart()
    }
  }, [watchKey])

  return active
}

/**
 * Tracks live-appended entry ids. `trackedIds` seeds/detects newcomers;
 * only ids also present in `eligibleIds` receive the glow.
 */
export function useIncomingIdHighlights(
  trackedIds: readonly string[],
  eligibleIds: readonly string[]
): ReadonlySet<string> {
  const [activeIds, setActiveIds] = useState<ReadonlySet<string>>(() => new Set())
  const knownRef = useRef<Set<string>>(new Set())
  const seededRef = useRef(false)
  const trackerRef = useRef<IdHighlightTracker | null>(null)
  const trackedKey = trackedIds.join('\0')
  const eligibleKey = eligibleIds.join('\0')

  useEffect(() => {
    const tracker = new IdHighlightTracker(INCOMING_HIGHLIGHT_DURATION_MS, setActiveIds)
    trackerRef.current = tracker
    return () => {
      tracker.dispose()
      trackerRef.current = null
    }
  }, [])

  useEffect(() => {
    const currentIds = trackedKey.length === 0 ? [] : trackedKey.split('\0')
    const eligible = new Set(eligibleKey.length === 0 ? [] : eligibleKey.split('\0'))
    const result = observeIncomingIds(knownRef.current, currentIds, seededRef.current)
    knownRef.current = result.nextKnown
    seededRef.current = result.seeded
    const toActivate = filterEligibleNewIds(result.newIds, eligible)
    if (toActivate.length > 0) {
      trackerRef.current?.activate(toActivate)
    }
  }, [trackedKey, eligibleKey])

  return activeIds
}
