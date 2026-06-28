import { describe, expect, it } from 'vitest'
import { mapStageToPlayerMessage, progressForStage } from './stageMessages'

describe('mapStageToPlayerMessage', () => {
  it('maps DB and LLM stages without leaking internal paths', () => {
    expect(mapStageToPlayerMessage('db', 'waitingDb', 'internal/db/path')).toBe(
      'Loading campaign database'
    )
    expect(mapStageToPlayerMessage('llm', 'waitingLlm', 'C:\\secret\\model.gguf')).toBe(
      'Booting narrative engine'
    )
  })

  it('maps ready state', () => {
    expect(mapStageToPlayerMessage(null, 'ready', '')).toBe('Ready to adventure')
  })

  it('keeps failure text as provided status', () => {
    expect(mapStageToPlayerMessage(null, 'failed', 'Narrative engine unreachable')).toBe(
      'Narrative engine unreachable'
    )
  })
})

describe('progressForStage', () => {
  it('never regresses or exceeds 100', () => {
    expect(progressForStage(0, 2)).toBe(0)
    expect(progressForStage(1, 2)).toBe(50)
    expect(progressForStage(2, 2)).toBe(100)
    expect(progressForStage(3, 2)).toBe(100)
  })
})
