import type { FleeAttemptResult as EngineFleeAttemptResult } from '../../../engine/fleeDisengage'

export const ENCOUNTER_PURSUIT_STATES = ['engaged', 'pursued'] as const
export type EncounterPursuitState = (typeof ENCOUNTER_PURSUIT_STATES)[number]

export const DM_ESCAPE_OUTCOMES = ['still_pursued', 'escaped'] as const
export type DmEscapeOutcome = (typeof DM_ESCAPE_OUTCOMES)[number]

export const FLEE_EXPOSITION_PHASES = ['failed', 'pursued', 'escaped'] as const
export type FleeExpositionPhase = (typeof FLEE_EXPOSITION_PHASES)[number]

export type FleeAttemptResult = EngineFleeAttemptResult

export interface DmEscapeJudgment {
  outcome: DmEscapeOutcome
  narrationText: string
}

export interface FleeTurnOutcome {
  phase: FleeExpositionPhase
  disengageCheck?: FleeAttemptResult
  narrationText: string
}

export function isEncounterPursuitState(value: unknown): value is EncounterPursuitState {
  return typeof value === 'string' && (ENCOUNTER_PURSUIT_STATES as readonly string[]).includes(value)
}

export function isDmEscapeOutcome(value: unknown): value is DmEscapeOutcome {
  return typeof value === 'string' && (DM_ESCAPE_OUTCOMES as readonly string[]).includes(value)
}

export function isFleeExpositionPhase(value: unknown): value is FleeExpositionPhase {
  return typeof value === 'string' && (FLEE_EXPOSITION_PHASES as readonly string[]).includes(value)
}

export function parseDmEscapeJudgment(value: unknown): DmEscapeJudgment | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const record = value as Record<string, unknown>
  if (!isDmEscapeOutcome(record['outcome']) || typeof record['narrationText'] !== 'string') {
    return undefined
  }
  const text = record['narrationText'].trim()
  if (!text) {
    return undefined
  }
  return { outcome: record['outcome'], narrationText: text }
}

export function validateDmEscapeJudgment(
  judgment: DmEscapeJudgment,
  checkSucceeded: boolean
): DmEscapeJudgment {
  if (!checkSucceeded && judgment.outcome === 'escaped') {
    return { outcome: 'still_pursued', narrationText: judgment.narrationText }
  }
  return judgment
}

export function fleeExpositionCopy(phase: FleeExpositionPhase, narrationText: string): string {
  const prefix: Record<FleeExpositionPhase, string> = {
    failed: 'Flee failed — ',
    pursued: 'Still pursued — ',
    escaped: 'Escaped — '
  }
  return `${prefix[phase]}${narrationText}`
}
