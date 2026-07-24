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

type ExitHandler = (...args: unknown[]) => void

function bindListener(
  listeners: Map<string, ExitHandler[]>,
  event: string,
  handler: ExitHandler
): void {
  const list = listeners.get(event) ?? []
  list.push(handler)
  listeners.set(event, list)
}

function createManagedChild(options?: { onTermExit?: boolean }): {
  child: {
    kill: ReturnType<typeof vi.fn>
    exitCode: number | null
    on: ReturnType<typeof vi.fn>
    once: ReturnType<typeof vi.fn>
    off: ReturnType<typeof vi.fn>
  }
  listeners: Map<string, ExitHandler[]>
  kill: ReturnType<typeof vi.fn>
} {
  const listeners = new Map<string, ExitHandler[]>()
  const kill = vi.fn()
  const child = {
    kill,
    exitCode: null as number | null,
    on: vi.fn((event: string, handler: ExitHandler) => {
      bindListener(listeners, event, handler)
      return child
    }),
    once: vi.fn((event: string, handler: ExitHandler) => {
      bindListener(listeners, event, handler)
      return child
    }),
    off: vi.fn((event: string, handler: ExitHandler) => {
      listeners.set(
        event,
        (listeners.get(event) ?? []).filter((item) => item !== handler)
      )
      return child
    })
  }
  if (options?.onTermExit !== false) {
    kill.mockImplementation((signal: string) => {
      if (signal === 'SIGTERM') {
        child.exitCode = 0
        for (const handler of listeners.get('exit') ?? []) {
          handler(0)
        }
      }
    })
  }
  return { child, listeners, kill }
}

function managedConfig(stopGraceMs?: number): ConstructorParameters<typeof LlamaCppLifecycleManager>[0] {
  return {
    baseUrl: 'http://127.0.0.1:8080',
    serverPath: 'llama-server.exe',
    modelPath: 'model.gguf',
    ctxSize: 8192,
    gpuLayers: 'all',
    startMode: 'managed',
    ...(stopGraceMs != null ? { stopGraceMs } : {})
  }
}

function loadingThenReadyHealth(): ReturnType<typeof vi.fn<(url: string) => Promise<number>>> {
  return vi
    .fn<(_url: string) => Promise<number>>()
    .mockResolvedValueOnce(0)
    .mockResolvedValue(200)
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

describe('LlamaCppLifecycleManager managed stop idempotent', () => {
  it('stop is idempotent and clears managed child', async () => {
    const { child, kill } = createManagedChild()
    const spawnProcess = vi.fn(() => child as never)
    const manager = new LlamaCppLifecycleManager(managedConfig(50), {
      spawnProcess,
      fetchHealth: loadingThenReadyHealth(),
      sleep: async () => undefined
    })
    await manager.start()
    await manager.stop()
    await manager.stop()
    expect(kill).toHaveBeenCalledWith('SIGTERM')
    expect(manager.getState()).toBe('stopped')
  })
})

describe('LlamaCppLifecycleManager managed stop force-kill', () => {
  it('force-kills when SIGTERM does not exit within grace window', async () => {
    const { child, kill } = createManagedChild({ onTermExit: false })
    const spawnProcess = vi.fn(() => child as never)
    const manager = new LlamaCppLifecycleManager(managedConfig(5), {
      spawnProcess,
      fetchHealth: loadingThenReadyHealth(),
      sleep: async () => undefined
    })
    await manager.start()
    await manager.stop()
    expect(kill).toHaveBeenCalledWith('SIGTERM')
    expect(kill).toHaveBeenCalledWith('SIGKILL')
  })
})

describe('LlamaCppLifecycleManager port conflict', () => {
  it('throws a typed port error when the base URL already responds', async () => {
    const spawnProcess = vi.fn()
    const fetchHealth = vi.fn<(_url: string) => Promise<number>>().mockResolvedValue(200)
    const manager = new LlamaCppLifecycleManager(managedConfig(), {
      spawnProcess,
      fetchHealth,
      sleep: async () => undefined
    })
    await expect(manager.start()).rejects.toMatchObject({ category: 'port' })
    expect(spawnProcess).not.toHaveBeenCalled()
  })
})

describe('LlamaCppLifecycleManager unexpected exit', () => {
  it('transitions ready to degraded when the child exits unexpectedly', async () => {
    const { child, listeners } = createManagedChild({ onTermExit: false })
    const spawnProcess = vi.fn(() => child as never)
    const manager = new LlamaCppLifecycleManager(managedConfig(), {
      spawnProcess,
      fetchHealth: loadingThenReadyHealth(),
      sleep: async () => undefined
    })
    await manager.start()
    expect(manager.getState()).toBe('ready')
    for (const handler of listeners.get('exit') ?? []) {
      handler(1)
    }
    expect(manager.getState()).toBe('degraded')
  })

  it('fails immediately when the child exits before health becomes ready', async () => {
    const { child, listeners } = createManagedChild({ onTermExit: false })
    const spawnProcess = vi.fn(() => child as never)
    const fetchHealth = vi.fn<(_url: string) => Promise<number>>().mockResolvedValue(0)
    const manager = new LlamaCppLifecycleManager(
      { ...managedConfig(), startupTimeoutMs: 60_000, healthPollIntervalMs: 1 },
      {
        spawnProcess,
        fetchHealth,
        sleep: async () => {
          child.exitCode = 1
          for (const handler of listeners.get('exit') ?? []) {
            handler(1)
          }
        }
      }
    )
    await expect(manager.start()).rejects.toMatchObject({
      category: 'runtime',
      message: expect.stringMatching(/exited before becoming ready/i)
    })
    expect(fetchHealth.mock.calls.length).toBeLessThan(5)
  })
})
