import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../../db/testUtils'
import { listLlmUsageEvents } from '../../db/repositories/llmUsageEvents'
import { createMockProvider } from './types'
import { withUsageRecording } from './withUsageRecording'
import type { GenerateContext, Provider } from './types'

function providerEmittingUsage(text: string, usage: {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  modelId: string
}): Provider {
  return {
    async generate(_prompt: string, context?: GenerateContext): Promise<string> {
      context?.onUsage?.(usage)
      return text
    }
  }
}

describe('withUsageRecording: persist success', () => {
  it('persists a success event with purpose and tokens', async () => {
    const db = createTestDb()
    const inner = providerEmittingUsage('ok', {
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      modelId: 'claude-test'
    })
    const provider = withUsageRecording(inner, {
      getDb: () => db,
      providerName: 'claude',
      defaultModelId: 'fallback'
    })

    await provider.generate('hi', { purpose: 'play.narration', campaignId: 'c1' })

    const rows = listLlmUsageEvents(db)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      purpose: 'play.narration',
      bucket: 'play',
      campaignId: 'c1',
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      modelId: 'claude-test',
      outcome: 'success'
    })
  })
})

describe('withUsageRecording: purpose fallback', () => {
  it('warns and uses other.unclassified when purpose is omitted', async () => {
    const db = createTestDb()
    const warn = vi.fn()
    const inner = providerEmittingUsage('ok', {
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      modelId: 'm'
    })
    const provider = withUsageRecording(inner, {
      getDb: () => db,
      providerName: 'claude',
      defaultModelId: 'fallback',
      warn
    })

    await provider.generate('hi')
    expect(warn).toHaveBeenCalled()
    expect(listLlmUsageEvents(db)[0]?.purpose).toBe('other.unclassified')
  })
})

describe('withUsageRecording: insert failures', () => {
  it('does not fail the generate when insert throws', async () => {
    const inner = providerEmittingUsage('ok', {
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      modelId: 'm'
    })
    const logInsertError = vi.fn()
    const provider = withUsageRecording(inner, {
      getDb: () => {
        throw new Error('db down')
      },
      providerName: 'claude',
      defaultModelId: 'fallback',
      logInsertError
    })

    await expect(provider.generate('hi', { purpose: 'system.ping' })).resolves.toBe('ok')
    expect(logInsertError).toHaveBeenCalled()
  })
})

describe('withUsageRecording: missing usage', () => {
  it('skips insert when inner provider emits no usage', async () => {
    const db = createTestDb()
    const provider = withUsageRecording(createMockProvider('plain'), {
      getDb: () => db,
      providerName: 'player2',
      defaultModelId: 'player2'
    })
    await provider.generate('hi', { purpose: 'system.ping' })
    expect(listLlmUsageEvents(db)).toHaveLength(0)
  })
})
