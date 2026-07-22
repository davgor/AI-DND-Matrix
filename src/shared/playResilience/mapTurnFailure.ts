import { DmSchemaError } from '../../agents/dm'
import { LevelUpPendingError } from '../../main/progressionPipeline'
import { ClaudeRequestError } from '../../agents/providers/claude'
import { GeminiRequestError } from '../../agents/providers/gemini'
import { GrokRequestError } from '../../agents/providers/grok'
import { OpenAiRequestError } from '../../agents/providers/openai'
import type { TurnFailureCategory } from './types'
import { turnFailureMessage } from './turnFailureMessage'

interface MappedTurnFailure {
  category: TurnFailureCategory
  message: string
}

function isProviderRequestError(error: unknown): boolean {
  return (
    error instanceof OpenAiRequestError ||
    error instanceof ClaudeRequestError ||
    error instanceof GeminiRequestError ||
    error instanceof GrokRequestError
  )
}

/** EPIC-136: map main/provider throws to player-safe categories. */
export function mapCaughtTurnError(error: unknown): MappedTurnFailure {
  if (error instanceof LevelUpPendingError) {
    return { category: 'validation_error', message: turnFailureMessage('validation_error') }
  }
  if (error instanceof DmSchemaError) {
    return { category: 'schema_error', message: turnFailureMessage('schema_error') }
  }
  if (isProviderRequestError(error)) {
    return { category: 'provider_error', message: turnFailureMessage('provider_error') }
  }
  return { category: 'internal_error', message: turnFailureMessage('internal_error') }
}
