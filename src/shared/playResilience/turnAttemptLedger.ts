import type { TurnResult } from '../../main/turnIpc'
import type { TurnFailureCategory } from './types'

interface FailedAttemptRecord {
  category: TurnFailureCategory
  message: string
  retryable: boolean
  mutationsCommitted: boolean
}

/** EPIC-136: in-memory idempotency ledger keyed by turnAttemptId (IPC-first; no schema). */
export class TurnAttemptLedger {
  private completed = new Map<string, TurnResult>()
  private failed = new Map<string, FailedAttemptRecord>()

  reset(): void {
    this.completed.clear()
    this.failed.clear()
  }

  getCompleted(turnAttemptId: string): TurnResult | undefined {
    return this.completed.get(turnAttemptId)
  }

  getFailed(turnAttemptId: string): FailedAttemptRecord | undefined {
    return this.failed.get(turnAttemptId)
  }

  complete(turnAttemptId: string, result: TurnResult): void {
    this.failed.delete(turnAttemptId)
    this.completed.set(turnAttemptId, result)
  }

  fail(
    turnAttemptId: string,
    record: FailedAttemptRecord
  ): void {
    this.failed.set(turnAttemptId, record)
  }

  clearFailed(turnAttemptId: string): void {
    this.failed.delete(turnAttemptId)
  }
}
