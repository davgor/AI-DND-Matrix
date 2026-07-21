/** Shared incoming-highlight timing and change-detection (epic 117). */

export const INCOMING_HIGHLIGHT_DURATION_MS = 2500
export const INCOMING_HIGHLIGHT_CLASS = 'incoming-highlight'

export type IncomingValueState = {
  seen: boolean
  previous: string
}

export function observeIncomingValue(
  state: IncomingValueState,
  value: string
): { next: IncomingValueState; shouldStartHighlight: boolean } {
  if (!state.seen) {
    return { next: { seen: true, previous: value }, shouldStartHighlight: false }
  }
  if (state.previous === value) {
    return { next: state, shouldStartHighlight: false }
  }
  return { next: { seen: true, previous: value }, shouldStartHighlight: true }
}

export function observeIncomingIds(
  known: ReadonlySet<string>,
  currentIds: readonly string[],
  seeded: boolean
): { nextKnown: Set<string>; newIds: string[]; seeded: true } {
  if (!seeded) {
    return { nextKnown: new Set(currentIds), newIds: [], seeded: true }
  }
  const newIds = currentIds.filter((id) => !known.has(id))
  const nextKnown = new Set(known)
  for (const id of currentIds) {
    nextKnown.add(id)
  }
  return { nextKnown, newIds, seeded: true }
}

/** New tracked ids that are also eligible to glow (e.g. sceneSetting / NPC dialogue). */
export function filterEligibleNewIds(
  newIds: readonly string[],
  eligibleIds: ReadonlySet<string>
): string[] {
  return newIds.filter((id) => eligibleIds.has(id))
}

export function incomingHighlightClassName(active: boolean, baseClass?: string): string {
  if (!active) {
    return baseClass ?? ''
  }
  return baseClass ? `${baseClass} ${INCOMING_HIGHLIGHT_CLASS}` : INCOMING_HIGHLIGHT_CLASS
}

type ScheduleFn = (handler: () => void, ms: number) => ReturnType<typeof setTimeout>
type CancelFn = (id: ReturnType<typeof setTimeout>) => void

/** Bound wrappers — bare `setTimeout` as a default arg throws Illegal invocation in Chromium. */
function defaultSchedule(handler: () => void, ms: number): ReturnType<typeof setTimeout> {
  return globalThis.setTimeout(handler, ms)
}

function defaultCancel(id: ReturnType<typeof setTimeout>): void {
  globalThis.clearTimeout(id)
}

export class HighlightTimer {
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly durationMs: number,
    private readonly setActive: (active: boolean) => void,
    private readonly schedule: ScheduleFn = defaultSchedule,
    private readonly cancel: CancelFn = defaultCancel
  ) {}

  restart(): void {
    this.setActive(true)
    if (this.timer !== null) {
      this.cancel(this.timer)
    }
    this.timer = this.schedule(() => {
      this.timer = null
      this.setActive(false)
    }, this.durationMs)
  }

  dispose(): void {
    if (this.timer !== null) {
      this.cancel(this.timer)
      this.timer = null
    }
  }
}

export class IdHighlightTracker {
  private readonly active = new Set<string>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(
    private readonly durationMs: number,
    private readonly onChange: (activeIds: ReadonlySet<string>) => void,
    private readonly schedule: ScheduleFn = defaultSchedule,
    private readonly cancel: CancelFn = defaultCancel
  ) {}

  activate(ids: readonly string[]): void {
    for (const id of ids) {
      this.active.add(id)
      const existing = this.timers.get(id)
      if (existing !== undefined) {
        this.cancel(existing)
      }
      this.timers.set(
        id,
        this.schedule(() => {
          this.timers.delete(id)
          this.active.delete(id)
          this.onChange(new Set(this.active))
        }, this.durationMs)
      )
    }
    this.onChange(new Set(this.active))
  }

  dispose(): void {
    for (const timer of this.timers.values()) {
      this.cancel(timer)
    }
    this.timers.clear()
    this.active.clear()
  }
}
