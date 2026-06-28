import { describe, expect, it, vi } from 'vitest'
import type { BootStageResult } from './bootStages'
import type { BootStage } from './bootStages'
import { StartupOrchestrator } from './orchestrator'

function makeStage(id: 'db' | 'llm', result: BootStageResult): BootStage {
  return {
    id,
    statusText: `${id} stage`,
    run: vi.fn(async () => result)
  }
}

describe('StartupOrchestrator', () => {
  it('runs stages in order and reaches ready', async () => {
    const events: unknown[] = []
    const orchestrator = new StartupOrchestrator({
      stages: [makeStage('db', { ok: true }), makeStage('llm', { ok: true })],
      onEvent: (payload) => events.push(payload)
    })
    await expect(orchestrator.start()).resolves.toBe(true)
    expect(orchestrator.getPhase()).toBe('ready')
    expect(orchestrator.hasHandedOff()).toBe(true)
    expect(events.at(-1)).toMatchObject({ phase: 'ready', progress: 100 })
  })

  it('propagates stage failure without invalid state', async () => {
    const orchestrator = new StartupOrchestrator({
      stages: [
        makeStage('db', { ok: true }),
        makeStage('llm', {
          ok: false,
          category: 'runtime',
          message: 'Engine down',
          recoverable: true
        })
      ],
      onEvent: () => undefined
    })
    await expect(orchestrator.start()).resolves.toBe(false)
    expect(orchestrator.getPhase()).toBe('failed')
    expect(orchestrator.hasHandedOff()).toBe(false)
    await expect(orchestrator.retry()).resolves.toBe(false)
  })

  it('hands off only once across duplicate start calls', async () => {
    const orchestrator = new StartupOrchestrator({
      stages: [makeStage('db', { ok: true }), makeStage('llm', { ok: true })],
      onEvent: () => undefined
    })
    await orchestrator.start()
    await orchestrator.start()
    expect(orchestrator.hasHandedOff()).toBe(true)
    expect(orchestrator.getPhase()).toBe('ready')
  })
})
