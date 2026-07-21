import type Database from 'better-sqlite3'
import type { AppConfig } from '../config'
import { LlamaCppLifecycleManager, LlamaCppLifecycleError } from '../llamacpp/lifecycle'
import type { BootErrorCategory, BootStageId } from '../../shared/startup/types'

export interface BootStageSuccess {
  ok: true
}

export interface BootStageFailure {
  ok: false
  category: BootErrorCategory
  message: string
  recoverable: boolean
}

export type BootStageResult = BootStageSuccess | BootStageFailure

export interface BootStage {
  id: BootStageId
  statusText: string
  run(onStatus?: (text: string) => void): Promise<BootStageResult>
}

export function createDbBootStage(openDb: () => Database.Database): BootStage {
  return {
    id: 'db',
    statusText: 'Opening campaign database',
    async run(onStatus) {
      onStatus?.('Running database migrations')
      try {
        const db = openDb()
        db.prepare('SELECT 1 AS ok').get()
        return { ok: true }
      } catch {
        return {
          ok: false,
          category: 'db',
          message: 'Could not open the campaign database. Check disk space and file permissions.',
          recoverable: true
        }
      }
    }
  }
}

async function checkHttpReachable(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    await fetch(baseUrl, { signal: controller.signal })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

async function checkClaudeReadiness(config: AppConfig): Promise<BootStageResult> {
  if (!config.claudeApiKey) {
    return {
      ok: false,
      category: 'config',
      message: 'Claude API key missing. Add CLAUDE_API_KEY to your .env file or Settings.',
      recoverable: true
    }
  }
  return { ok: true }
}

async function checkCloudKeyReadiness(
  key: string | undefined,
  label: string,
  envVar: string
): Promise<BootStageResult> {
  if (!key) {
    return {
      ok: false,
      category: 'config',
      message: `${label} API key missing. Add ${envVar} to your .env file or Settings.`,
      recoverable: true
    }
  }
  return { ok: true }
}

async function checkPlayer2Readiness(config: AppConfig, onStatus?: (text: string) => void): Promise<BootStageResult> {
  onStatus?.('Checking local narrative engine connection')
  const reachable = await checkHttpReachable(`${config.player2BaseUrl}/v1/models`, 5000)
  if (!reachable) {
    return {
      ok: false,
      category: 'runtime',
      message:
        'Player2 is not reachable. Start the Player2 app or set PLAYER2_BASE_URL to a running instance.',
      recoverable: true
    }
  }
  return { ok: true }
}

async function checkLlamaCppReadiness(
  config: AppConfig,
  lifecycle: LlamaCppLifecycleManager,
  onStatus?: (text: string) => void
): Promise<BootStageResult> {
  onStatus?.(
    config.llamaCppStartMode === 'managed'
      ? 'Launching local narrative engine'
      : 'Waiting for local narrative engine'
  )
  try {
    await lifecycle.start()
    return { ok: true }
  } catch (error) {
    if (error instanceof LlamaCppLifecycleError) {
      return {
        ok: false,
        category: error.category === 'config' ? 'config' : 'runtime',
        message: error.message,
        recoverable: error.category !== 'config'
      }
    }
    return {
      ok: false,
      category: 'unknown',
      message: 'An unexpected error occurred while starting the narrative engine.',
      recoverable: true
    }
  }
}

export function createLlmBootStage(config: AppConfig, lifecycle?: LlamaCppLifecycleManager): BootStage {
  return {
    id: 'llm',
    statusText: 'Initializing narrative engine',
    async run(onStatus) {
      if (config.agentProvider === 'claude') {
        return checkClaudeReadiness(config)
      }
      if (config.agentProvider === 'openai') {
        return checkCloudKeyReadiness(config.openaiApiKey, 'OpenAI', 'OPENAI_API_KEY')
      }
      if (config.agentProvider === 'gemini') {
        return checkCloudKeyReadiness(config.geminiApiKey, 'Gemini', 'GEMINI_API_KEY')
      }
      if (config.agentProvider === 'grok') {
        return checkCloudKeyReadiness(config.grokApiKey, 'Grok', 'GROK_API_KEY')
      }
      if (config.agentProvider === 'player2') {
        return checkPlayer2Readiness(config, onStatus)
      }
      const manager =
        lifecycle ??
        new LlamaCppLifecycleManager({
          baseUrl: config.llamaCppBaseUrl,
          serverPath: config.llamaCppServerPath,
          modelPath: config.llamaCppModelPath,
          ctxSize: config.llamaCppCtxSize,
          gpuLayers: config.llamaCppGpuLayers,
          startMode: config.llamaCppStartMode
        })
      return checkLlamaCppReadiness(config, manager, onStatus)
    }
  }
}
