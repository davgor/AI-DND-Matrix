import type { TurnResolveResult } from '../../../shared/playResilience/types'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'

export async function resolvePlayerTurn(input: {
  campaignId: string
  characterId: string
  playerInput: string
  clientTraceId?: string
  turnAttemptId?: string
}): Promise<TurnResolveResult> {
  return window.turn.resolve(input)
}

export function idleExposition(): ExpositionStatus {
  return { state: 'idle', errorMessage: null }
}

export function loadingExposition(): ExpositionStatus {
  return { state: 'loading', errorMessage: null }
}

export function failedExposition(message: string): ExpositionStatus {
  return { state: 'error', errorMessage: message }
}
