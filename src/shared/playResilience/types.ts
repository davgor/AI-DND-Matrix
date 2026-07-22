import type { TurnResult } from '../../main/turnIpc'

/** EPIC-136: failure categories aligned with guided-creation parity. */
export type TurnFailureCategory =
  | 'provider_error'
  | 'schema_error'
  | 'validation_error'
  | 'internal_error'

interface TurnResolveSuccess {
  ok: true
  result: TurnResult
}

interface TurnResolveFailure {
  ok: false
  category: TurnFailureCategory
  message: string
  retryable: boolean
  turnAttemptId: string
}

export type TurnResolveResult = TurnResolveSuccess | TurnResolveFailure

export interface PendingTurnFailure {
  category: TurnFailureCategory
  message: string
  retryable: boolean
  turnAttemptId: string
  playerInput: string
}
