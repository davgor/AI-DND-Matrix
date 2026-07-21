/**
 * D20 overlay trigger contract (epic 118 / 118.1).
 *
 * Trigger: a new live `check` after the play view has mounted (seeded). First
 * paint with an existing/hydrated check does not animate.
 * Face: natural `check.roll` (1–20), not total or DC.
 * Concurrency: a newer check replaces the in-flight overlay (one die at a time).
 * Layer: pointer-events none; never blocks play input.
 *
 * Show rolls:
 * - On: settled face label may remain visible through the settle hold.
 * - Off: animation still runs, but face label uses `brief-then-clear` — no
 *   persistent numeric spoil after settle (spectacle without the math line).
 *
 * Reduced motion: skip travel tumble; brief settle/fade then clear
 * (`D20_OVERLAY_REDUCED_MOTION_MS`).
 */

export const D20_OVERLAY_TRAVEL_MS = 1100
export const D20_OVERLAY_SETTLE_MS = 900
export const D20_OVERLAY_EXIT_MS = 350
export const D20_OVERLAY_REDUCED_MOTION_MS = 700

/** Face-label policy when Show rolls is off (product lock). */
export const D20_SHOW_ROLLS_OFF_FACE_POLICY = 'brief-then-clear' as const

export type CheckSnapshot = {
  roll: number
  total: number
  dc: number
  success: boolean
} | null

export type D20OverlayObserveState = {
  seen: boolean
  previousKey: string | null
}

export function totalOverlayDurationMs(): number {
  return D20_OVERLAY_TRAVEL_MS + D20_OVERLAY_SETTLE_MS + D20_OVERLAY_EXIT_MS
}

export function checkIdentityKey(check: CheckSnapshot): string | null {
  if (!check) {
    return null
  }
  return `${check.roll}|${check.total}|${check.dc}|${check.success}`
}

export function clampD20Face(face: number): number {
  if (!Number.isFinite(face)) {
    return 1
  }
  return Math.min(20, Math.max(1, Math.round(face)))
}

export function observeLiveCheck(
  state: D20OverlayObserveState,
  check: CheckSnapshot
): { next: D20OverlayObserveState; shouldAnimate: boolean; face: number | null } {
  const key = checkIdentityKey(check)
  if (!state.seen) {
    return { next: { seen: true, previousKey: key }, shouldAnimate: false, face: null }
  }
  if (key === null || key === state.previousKey) {
    return { next: { seen: true, previousKey: key }, shouldAnimate: false, face: null }
  }
  return {
    next: { seen: true, previousKey: key },
    shouldAnimate: true,
    face: clampD20Face(check!.roll)
  }
}

/** When Show rolls is on, keep the face readable through settle; off = brief flash only. */
export function shouldPersistSettledFaceLabel(showRolls: boolean): boolean {
  return showRolls
}
