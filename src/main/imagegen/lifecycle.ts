import { spawn, type ChildProcess } from 'node:child_process'

type ImageGenLifecycleState = 'stopped' | 'starting' | 'ready' | 'degraded' | 'stopping'

export class ImageGenLifecycleError extends Error {
  readonly category: 'runtime' | 'config' | 'timeout' | 'port'

  constructor(message: string, category: 'runtime' | 'config' | 'timeout' | 'port') {
    super(message)
    this.name = 'ImageGenLifecycleError'
    this.category = category
  }
}

export interface ImageGenLifecycleConfig {
  baseUrl: string
  serverPath?: string
  modelPath?: string
  startMode: 'managed' | 'attach'
  healthPollIntervalMs?: number
  startupTimeoutMs?: number
  stopGraceMs?: number
}

interface ImageGenLifecycleDeps {
  spawnProcess?: typeof spawn
  fetchHealth?: (url: string) => Promise<number>
  sleep?: (ms: number) => Promise<void>
}

const DEFAULT_POLL_MS = 500
const DEFAULT_TIMEOUT_MS = 120_000
const DEFAULT_STOP_GRACE_MS = 2_000

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function defaultFetchHealth(baseUrl: string): Promise<number> {
  const response = await fetch(`${baseUrl}/v1/models`)
  return response.status
}

export class ImageGenLifecycleManager {
  private state: ImageGenLifecycleState = 'stopped'
  private child: ChildProcess | null = null
  private startPromise: Promise<ImageGenLifecycleState> | null = null
  private readonly spawnFn: typeof spawn
  private readonly fetchHealth: (url: string) => Promise<number>
  private readonly sleep: (ms: number) => Promise<void>

  constructor(
    private readonly config: ImageGenLifecycleConfig,
    deps: ImageGenLifecycleDeps = {}
  ) {
    this.spawnFn = deps.spawnProcess ?? spawn
    this.fetchHealth = deps.fetchHealth ?? defaultFetchHealth
    this.sleep = deps.sleep ?? defaultSleep
  }

  getState(): ImageGenLifecycleState {
    return this.state
  }

  async start(): Promise<ImageGenLifecycleState> {
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

  private async doStart(): Promise<ImageGenLifecycleState> {
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
    const child = this.child
    this.child = null
    if (child) {
      await this.terminateChild(child)
    }
    this.state = 'stopped'
  }

  private async terminateChild(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null) {
      return
    }
    child.kill('SIGTERM')
    const graceMs = this.config.stopGraceMs ?? DEFAULT_STOP_GRACE_MS
    const exited = await this.waitForChildExit(child, graceMs)
    if (!exited && child.exitCode === null) {
      child.kill('SIGKILL')
    }
  }

  private waitForChildExit(child: ChildProcess, graceMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (child.exitCode !== null) {
        resolve(true)
        return
      }
      const timer = setTimeout(() => resolve(false), graceMs)
      child.once('exit', () => {
        clearTimeout(timer)
        resolve(true)
      })
    })
  }

  private async waitForAttachReady(): Promise<ImageGenLifecycleState> {
    this.state = 'starting'
    const ready = await this.pollUntilReady()
    this.state = ready ? 'ready' : 'degraded'
    return this.state
  }

  private async startManaged(): Promise<ImageGenLifecycleState> {
    const serverPath = this.config.serverPath?.trim()
    const modelPath = this.config.modelPath?.trim()
    if (!serverPath || !modelPath) {
      throw new ImageGenLifecycleError(
        'Managed sd-server requires serverPath and modelPath.',
        'config'
      )
    }
    this.state = 'starting'
    const url = new URL(this.config.baseUrl)
    this.child = this.spawnFn(
      serverPath,
      ['--host', url.hostname, '--port', url.port || '8190', '-m', modelPath],
      { stdio: 'ignore' }
    )
    const ready = await this.pollUntilReady()
    this.state = ready ? 'ready' : 'degraded'
    return this.state
  }

  private async pollUntilReady(): Promise<boolean> {
    const pollMs = this.config.healthPollIntervalMs ?? DEFAULT_POLL_MS
    const timeoutMs = this.config.startupTimeoutMs ?? DEFAULT_TIMEOUT_MS
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      try {
        const status = await this.fetchHealth(this.config.baseUrl)
        if (status === 200) {
          return true
        }
      } catch {
        // keep polling until timeout
      }
      await this.sleep(pollMs)
    }
    return false
  }
}
