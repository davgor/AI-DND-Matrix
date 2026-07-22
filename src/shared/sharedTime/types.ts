/**
 * Multi-PC shared time — Model B (epic 133).
 * One campaign clock (`campaigns.in_game_date`) + per-PC last-active watermark.
 */

/** Locked product model: shared clock + per-PC watermark + deterministic away digest. */
export type SharedTimeModel = 'B'

export const SHARED_TIME_MODEL: SharedTimeModel = 'B'

/** Explicit non-goals for v1 (do not invent parallel calendars). */
export const SHARED_TIME_NON_GOALS: readonly string[] = [
  'No parallel calendars per PC',
  'No off-screen adventure sim / XP grind while away',
  'No season/weather simulation'
]

/** Hub chrome label for the shared campaign clock (not a private timeline). */
export const SHARED_TIME_HUB_CLOCK_LABEL = 'World day'

/** Max event headlines included in a deterministic away digest. */
export const AWAY_DIGEST_MAX_HEADLINES = 3

/** Per-PC watermark: last world day this character was the active player. */
export interface CharacterTimeWatermark {
  characterId: string
  lastActiveInGameDate: number
}

/** Inputs for the deterministic away digest (no LLM required). */
export interface AwayDigestInput {
  worldDay: number
  lastActiveInGameDate: number
  eventHeadlines?: readonly string[]
}

/** Derived “while you were away” digest — not a second clock. */
export interface AwayDigest {
  awayDays: number
  worldDay: number
  lastActiveInGameDate: number
  summary: string
  eventHeadlines: string[]
}

/** Hub cast / resume DTO slice for shared-time UX. */
export interface SharedTimeCastFields {
  lastActiveInGameDate: number
  awayBlurb: string
}

export function computeAwayDays(worldDay: number, lastActiveInGameDate: number): number {
  return Math.max(0, worldDay - lastActiveInGameDate)
}

export function isAwayFromClock(worldDay: number, lastActiveInGameDate: number): boolean {
  return computeAwayDays(worldDay, lastActiveInGameDate) > 0
}

export function formatWorldDayLabel(worldDay: number): string {
  return `${SHARED_TIME_HUB_CLOCK_LABEL} ${worldDay}`
}

export function formatLastActiveLabel(lastActiveInGameDate: number): string {
  return `Last active: day ${lastActiveInGameDate}`
}

export function formatAwayBlurb(worldDay: number, lastActiveInGameDate: number): string {
  const awayDays = computeAwayDays(worldDay, lastActiveInGameDate)
  if (awayDays <= 0) {
    return ''
  }
  const dayWord = awayDays === 1 ? 'day' : 'days'
  return `${awayDays} ${dayWord} of shared world time passed while away (now ${formatWorldDayLabel(worldDay)}).`
}

export function buildAwayDigest(input: AwayDigestInput): AwayDigest | null {
  const awayDays = computeAwayDays(input.worldDay, input.lastActiveInGameDate)
  if (awayDays <= 0) {
    return null
  }
  const headlines = (input.eventHeadlines ?? [])
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, AWAY_DIGEST_MAX_HEADLINES)
  return {
    awayDays,
    worldDay: input.worldDay,
    lastActiveInGameDate: input.lastActiveInGameDate,
    summary: formatAwayBlurb(input.worldDay, input.lastActiveInGameDate),
    eventHeadlines: headlines
  }
}

/** Grounding line for DM / inactive proxy — shared clock only. */
export function formatSharedTimeGrounding(input: {
  worldDay: number
  lastActiveInGameDate: number
}): string {
  const awayDays = computeAwayDays(input.worldDay, input.lastActiveInGameDate)
  const base = `Shared campaign clock: ${formatWorldDayLabel(input.worldDay)}. This character last active on day ${input.lastActiveInGameDate}.`
  if (awayDays <= 0) {
    return `${base} Do not invent a private calendar.`
  }
  return `${base} Away for ${awayDays} shared day(s). Do not invent a private calendar.`
}
