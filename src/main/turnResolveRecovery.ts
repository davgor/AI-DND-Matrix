import type Database from 'better-sqlite3'
import type { Provider } from '../agents/providers/types'
import type { RandomFn } from '../engine/abilities'
import { TurnAttemptLedger } from '../shared/playResilience/turnAttemptLedger'
import { mapCaughtTurnError } from '../shared/playResilience/mapTurnFailure'
import type { TurnResolveResult } from '../shared/playResilience/types'
import {
  resolvePlayerTurn,
  type TurnExecutionHooks,
  type TurnInput,
  type TurnResolveOptions
} from './turnIpc'

const ledger = new TurnAttemptLedger()

/** @internal test hook */
export function resetTurnAttemptLedgerForTests(): void {
  ledger.reset()
}

function retryableFailure(
  mapped: ReturnType<typeof mapCaughtTurnError>,
  mutationsCommitted: boolean
): boolean {
  if (mutationsCommitted) {
    return false
  }
  return mapped.category !== 'validation_error'
}

function lookupCachedTurnAttempt(turnAttemptId: string): TurnResolveResult | null {
  const cached = ledger.getCompleted(turnAttemptId)
  if (cached) {
    return { ok: true, result: cached }
  }
  const failed = ledger.getFailed(turnAttemptId)
  if (failed && !failed.retryable) {
    return {
      ok: false,
      category: failed.category,
      message: failed.message,
      retryable: false,
      turnAttemptId
    }
  }
  return null
}

function recordTurnFailure(
  turnAttemptId: string,
  mapped: ReturnType<typeof mapCaughtTurnError>,
  retryable: boolean,
  mutationsCommitted: boolean
): TurnResolveResult {
  if (turnAttemptId) {
    ledger.fail(turnAttemptId, {
      category: mapped.category,
      message: mapped.message,
      retryable,
      mutationsCommitted
    })
  }
  return {
    ok: false,
    category: mapped.category,
    message: mapped.message,
    retryable,
    turnAttemptId
  }
}

async function executeTurnWithHooks(input: {
  db: Database.Database
  provider: Provider
  turnInput: TurnInput
  options: TurnResolveOptions
  turnAttemptId: string
}): Promise<TurnResolveResult> {
  const { db, provider, turnInput, options, turnAttemptId } = input
  let mutationsCommitted = false
  const hooks: TurnExecutionHooks = {
    onMutationCommitted: () => {
      mutationsCommitted = true
      options.hooks?.onMutationCommitted?.()
    }
  }

  try {
    const result = await resolvePlayerTurn(db, provider, turnInput, { ...options, hooks })
    if (turnAttemptId) {
      ledger.complete(turnAttemptId, result)
    }
    return { ok: true, result }
  } catch (error) {
    const mapped = mapCaughtTurnError(error)
    return recordTurnFailure(
      turnAttemptId,
      mapped,
      retryableFailure(mapped, mutationsCommitted),
      mutationsCommitted
    )
  }
}

export async function resolvePlayerTurnForIpc(
  db: Database.Database,
  provider: Provider,
  turnInput: TurnInput,
  rng: RandomFn
): Promise<TurnResolveResult> {
  const turnAttemptId = turnInput.turnAttemptId?.trim() ?? ''

  if (turnAttemptId) {
    const cached = lookupCachedTurnAttempt(turnAttemptId)
    if (cached) {
      return cached
    }
  }

  return executeTurnWithHooks({ db, provider, turnInput, options: { rng }, turnAttemptId })
}
