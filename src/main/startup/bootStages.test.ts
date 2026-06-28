import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../../db/testUtils'
import { createDbBootStage, createLlmBootStage } from './bootStages'
import type { AppConfig } from '../config'

const BASE_CONFIG: AppConfig = {
  agentProvider: 'claude',
  player2BaseUrl: 'http://127.0.0.1:4315',
  claudeApiKey: 'sk-test',
  claudeModel: 'claude-sonnet-4-6',
  llamaCppBaseUrl: 'http://127.0.0.1:8080',
  llamaCppServerPath: undefined,
  llamaCppModelPath: undefined,
  llamaCppCtxSize: 8192,
  llamaCppGpuLayers: 'all',
  llamaCppStartMode: 'attach'
}

describe('createDbBootStage', () => {
  it('succeeds when DB opens and migrations apply', async () => {
    const stage = createDbBootStage(() => createTestDb())
    await expect(stage.run()).resolves.toEqual({ ok: true })
  })

  it('returns typed failure on connection error', async () => {
    const stage = createDbBootStage(() => {
      throw new Error('disk full')
    })
    const result = await stage.run()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('db')
      expect(result.recoverable).toBe(true)
    }
  })
})

describe('createLlmBootStage', () => {
  it('requires Claude API key in config', async () => {
    const stage = createLlmBootStage({ ...BASE_CONFIG, claudeApiKey: undefined })
    const result = await stage.run()
    expect(result).toMatchObject({ ok: false, category: 'config' })
  })

  it('reports Player2 unreachable without crashing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    const stage = createLlmBootStage({ ...BASE_CONFIG, agentProvider: 'player2' })
    const result = await stage.run()
    expect(result).toMatchObject({ ok: false, category: 'runtime', recoverable: true })
    vi.unstubAllGlobals()
  })
})
