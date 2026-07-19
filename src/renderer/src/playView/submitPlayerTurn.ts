import type { TurnResult } from '../../../main/turnIpc'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'

export async function resolvePlayerTurn(input: {
  campaignId: string
  characterId: string
  playerInput: string
  clientTraceId?: string
}): Promise<TurnResult> {
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
