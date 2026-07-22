import { describe, expect, it } from 'vitest'
import { DmSchemaError } from '../../agents/dm'
import { LevelUpPendingError } from '../../main/progressionPipeline'
import { OpenAiRequestError } from '../../agents/providers/openai'
import { mapCaughtTurnError } from './mapTurnFailure'
import { turnFailureMessage } from './turnFailureMessage'

describe('mapCaughtTurnError', () => {
  it('maps schema errors to schema_error copy', () => {
    const mapped = mapCaughtTurnError(new DmSchemaError('bad json'))
    expect(mapped.category).toBe('schema_error')
    expect(mapped.message).toBe(turnFailureMessage('schema_error'))
  })

  it('maps provider request errors to provider_error copy', () => {
    const mapped = mapCaughtTurnError(new OpenAiRequestError('offline', 503))
    expect(mapped.category).toBe('provider_error')
    expect(mapped.message).toBe(turnFailureMessage('provider_error'))
  })

  it('maps pending level-up gate to validation_error copy', () => {
    const mapped = mapCaughtTurnError(new LevelUpPendingError())
    expect(mapped.category).toBe('validation_error')
    expect(mapped.message).toBe(turnFailureMessage('validation_error'))
  })

  it('maps unknown errors to internal_error copy', () => {
    const mapped = mapCaughtTurnError(new Error('boom'))
    expect(mapped.category).toBe('internal_error')
    expect(mapped.message).toBe(turnFailureMessage('internal_error'))
  })
})

describe('turnFailureMessage', () => {
  it('returns non-empty player-facing strings for every category', () => {
    for (const category of ['provider_error', 'schema_error', 'validation_error', 'internal_error'] as const) {
      expect(turnFailureMessage(category).length).toBeGreaterThan(10)
      expect(turnFailureMessage(category)).not.toMatch(/DmSchemaError|stack|undefined/i)
    }
  })
})
