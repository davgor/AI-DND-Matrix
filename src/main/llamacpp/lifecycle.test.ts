import { describe, expect, it, vi } from 'vitest'
import { LlamaCppLifecycleManager } from './lifecycle'

function attachManager(
  fetchHealth: (_url: string) => Promise<number>,
  overrides: Partial<ConstructorParameters<typeof LlamaCppLifecycleManager>[0]> = {}
): LlamaCppLifecycleManager {
  return new LlamaCppLifecycleManager(
    {
      baseUrl: 'http://127.0.0.1:8080',
      ctxSize: 8192,
      gpuLayers: 'all',
      startMode: 'attach',
      ...overrides
    },
    { fetchHealth, sleep: async () => undefined }
  )
}

describe('LlamaCppLifecycleManager concurrent start', () => {
  it('deduplicates concurrent start calls', async () => {
    const fetchHealth = vi
      .fn<(_url: string) => Promise<number>>()
      .mockResolvedValueOnce(503)
      .mockResolvedValue(200)
    const manager = attachManager(fetchHealth)
    const first = manager.start()
    const second = manager.start()
    await expect(first).resolves.toBe('ready')
    await expect(second).resolves.toBe('ready')
    expect(manager.getState()).toBe('ready')
  })
})

describe('LlamaCppLifecycleManager health polling', () => {
  it('treats 503 as still loading until 200', async () => {
    const fetchHealth = vi
      .fn<(_url: string) => Promise<number>>()
      .mockResolvedValueOnce(503)
      .mockResolvedValueOnce(503)
      .mockResolvedValue(200)
    const manager = attachManager(fetchHealth, { startupTimeoutMs: 5000, healthPollIntervalMs: 1 })
    await expect(manager.start()).resolves.toBe('ready')
    expect(fetchHealth).toHaveBeenCalledTimes(3)
  })

  it('times out with typed runtime error', async () => {
    const fetchHealth = vi.fn<(_url: string) => Promise<number>>().mockResolvedValue(503)
    const manager = attachManager(fetchHealth, { startupTimeoutMs: 10, healthPollIntervalMs: 1 })
    await expect(manager.start()).rejects.toMatchObject({ category: 'runtime' })
  })
})

describe('LlamaCppLifecycleManager managed stop', () => {
  it('stop is idempotent and clears managed child', async () => {
    const kill = vi.fn()
    const child = { kill, on: vi.fn() }
    const spawnProcess = vi.fn(() => child as never)
    const fetchHealth = vi.fn<(_url: string) => Promise<number>>().mockResolvedValue(200)
    const manager = new LlamaCppLifecycleManager(
      {
        baseUrl: 'http://127.0.0.1:8080',
        serverPath: 'llama-server.exe',
        modelPath: 'model.gguf',
        ctxSize: 8192,
        gpuLayers: 'all',
        startMode: 'managed'
      },
      { spawnProcess, fetchHealth, sleep: async () => undefined }
    )
    await manager.start()
    await manager.stop()
    await manager.stop()
    expect(kill).toHaveBeenCalledTimes(1)
    expect(manager.getState()).toBe('stopped')
  })
})
