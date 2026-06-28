import { spawn, type ChildProcess } from 'node:child_process'

export type LlamaCppLifecycleState = 'stopped' | 'starting' | 'ready' | 'degraded' | 'stopping'

export class LlamaCppLifecycleError extends Error {
  readonly category: 'runtime' | 'config' | 'timeout'

  constructor(message: string, category: 'runtime' | 'config' | 'timeout') {
    super(message)
    this.category = category
  }
}

export interface LlamaCppLifecycleConfig {
  baseUrl: string
  serverPath?: string
  modelPath?: string
  ctxSize: number
  gpuLayers: string
  startMode: 'managed' | 'attach'
  healthPollIntervalMs?: number
  startupTimeoutMs?: number
}

export interface LlamaCppLifecycleDeps {
  spawnProcess?: typeof spawn
  fetchHealth?: (url: string) => Promise<number>
  sleep?: (ms: number) => Promise<void>
}

const DEFAULT_POLL_MS = 500
const DEFAULT_TIMEOUT_MS = 60_000

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseBaseUrl(baseUrl: string): { host: string; port: string } {
  const url = new URL(baseUrl)
  return { host: url.hostname, port: url.port || '8080' }
}

async function defaultFetchHealth(url: string): Promise<number> {
  const response = await fetch(`${url}/health`)
  return response.status
}

export class LlamaCppLifecycleManager {
  private state: LlamaCppLifecycleState = 'stopped'
  private child: ChildProcess | null = null
  private startPromise: Promise<LlamaCppLifecycleState> | null = null
  private readonly spawnFn: typeof spawn
  private readonly fetchHealth: (url: string) => Promise<number>
  private readonly sleep: (ms: number) => Promise<void>

  constructor(
    private readonly config: LlamaCppLifecycleConfig,
    deps: LlamaCppLifecycleDeps = {}
  ) {
    this.spawnFn = deps.spawnProcess ?? spawn
    this.fetchHealth = deps.fetchHealth ?? defaultFetchHealth
    this.sleep = deps.sleep ?? defaultSleep
  }

  getState(): LlamaCppLifecycleState {
    return this.state
  }

  async start(): Promise<LlamaCppLifecycleState> {
    if (this.state === 'ready') {
      return this.state
    }
    if (this.startPromise) {
      return this.startPromise
    }
    this.startPromise = this.doStart().finally(() => {
      this.startPromise = null
    })
    return this.startPromise
  }

  private async doStart(): Promise<LlamaCppLifecycleState> {
    if (this.state === 'starting') {
      return this.state
    }
    if (this.config.startMode === 'attach') {
      return this.waitForAttachReady()
    }
    return this.startManaged()
  }

  async stop(): Promise<void> {
    if (this.state === 'stopped' || this.state === 'stopping') {
      this.state = 'stopped'
      return
    }
    this.state = 'stopping'
    if (this.child) {
      this.child.kill('SIGTERM')
      this.child = null
    }
    this.state = 'stopped'
  }

  private async waitForAttachReady(): Promise<LlamaCppLifecycleState> {
    this.state = 'starting'
    const ready = await this.pollUntilReady()
    this.state = ready ? 'ready' : 'degraded'
    if (!ready) {
      throw new LlamaCppLifecycleError(
        'Could not reach the local narrative engine. Start llama-server or switch to managed mode.',
        'runtime'
      )
    }
    return this.state
  }

  private async startManaged(): Promise<LlamaCppLifecycleState> {
    if (!this.config.serverPath || !this.config.modelPath) {
      throw new LlamaCppLifecycleError(
        'Managed mode requires LLAMA_CPP_SERVER_PATH and LLAMA_CPP_MODEL_PATH in .env',
        'config'
      )
    }
    this.state = 'starting'
    const { host, port } = parseBaseUrl(this.config.baseUrl)
    this.child = this.spawnFn(
      this.config.serverPath,
      [
        '--host',
        host,
        '--port',
        port,
        '-m',
        this.config.modelPath,
        '-c',
        String(this.config.ctxSize),
        '--n-gpu-layers',
        this.config.gpuLayers
      ],
      { stdio: 'ignore' }
    )
    this.child.on('exit', () => {
      if (this.state === 'ready') {
        this.state = 'degraded'
      }
    })
    const ready = await this.pollUntilReady()
    this.state = ready ? 'ready' : 'degraded'
    if (!ready) {
      throw new LlamaCppLifecycleError(
        'Local narrative engine failed to become ready before timeout.',
        'timeout'
      )
    }
    return this.state
  }

  private async pollUntilReady(): Promise<boolean> {
    const timeoutMs = this.config.startupTimeoutMs ?? DEFAULT_TIMEOUT_MS
    const pollMs = this.config.healthPollIntervalMs ?? DEFAULT_POLL_MS
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const status = await this.fetchHealth(this.config.baseUrl).catch(() => 0)
      if (status === 200) {
        return true
      }
      await this.sleep(pollMs)
    }
    return false
  }
}
