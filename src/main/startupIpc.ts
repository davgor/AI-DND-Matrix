import { ipcMain, type BrowserWindow } from 'electron'
import { getDb } from './db'
import { loadConfig, type AppConfig } from './config'
import { LlamaCppLifecycleManager } from './llamacpp/lifecycle'
import { createDbBootStage, createLlmBootStage } from './startup/bootStages'
import { StartupOrchestrator } from './startup/orchestrator'
import type { StartupEventPayload, StartupFailurePayload, StartupProgressPayload } from '../shared/startup/types'
import { DEFAULT_PROVIDER_SETTINGS } from '../shared/settings/types'
import {
  createElectronSecretCodec,
  getSettingsFilePath,
  loadSettingsOrNull
} from './settingsStore'
import {
  resolveLlamaCppLifecycleConfig,
  resolveProviderRegistryConfig
} from './settingsRuntime'

let orchestrator: StartupOrchestrator | undefined
let llamaLifecycle: LlamaCppLifecycleManager | undefined
let mainWindow: BrowserWindow | undefined

function getSnapshot(): StartupEventPayload {
  const current = orchestrator
  if (!current) {
    return {
      phase: 'idle',
      stageIndex: 0,
      stageTotal: 2,
      stage: null,
      statusText: 'Waiting to start',
      progress: 0
    }
  }
  if (current.getPhase() === 'failed' && current.getLastFailure()) {
    return current.getLastFailure() as StartupFailurePayload
  }
  if (current.getLastProgress()) {
    return current.getLastProgress() as StartupProgressPayload
  }
  return {
    phase: current.getPhase(),
    stageIndex: 0,
    stageTotal: 2,
    stage: null,
    statusText: 'Waiting to start',
    progress: 0
  }
}

function broadcast(payload: StartupEventPayload): void {
  mainWindow?.webContents.send('startup:event', payload)
}

/** Prefer persisted Settings; `.env` remains override/fallback when fields are empty. */
function resolveBootAppConfig(): AppConfig {
  const env = loadConfig()
  const persisted = loadSettingsOrNull(
    getSettingsFilePath(),
    createElectronSecretCodec(),
    DEFAULT_PROVIDER_SETTINGS
  )
  if (!persisted) {
    return env
  }
  const resolved = resolveProviderRegistryConfig(env, persisted)
  const life = resolveLlamaCppLifecycleConfig(env, persisted)
  return {
    ...env,
    agentProvider: resolved.agentProvider,
    claudeApiKey: resolved.claudeApiKey,
    claudeModel: resolved.claudeModel,
    openaiApiKey: resolved.openaiApiKey,
    openaiModel: resolved.openaiModel,
    geminiApiKey: resolved.geminiApiKey,
    geminiModel: resolved.geminiModel,
    grokApiKey: resolved.grokApiKey,
    grokModel: resolved.grokModel,
    player2BaseUrl: resolved.player2BaseUrl,
    llamaCppBaseUrl: life.baseUrl,
    llamaCppServerPath: life.serverPath,
    llamaCppModelPath: life.modelPath,
    llamaCppCtxSize: life.ctxSize,
    llamaCppGpuLayers: life.gpuLayers,
    llamaCppStartMode: life.startMode
  }
}

function buildOrchestrator(): StartupOrchestrator {
  const config = resolveBootAppConfig()
  llamaLifecycle = new LlamaCppLifecycleManager({
    baseUrl: config.llamaCppBaseUrl,
    serverPath: config.llamaCppServerPath,
    modelPath: config.llamaCppModelPath,
    ctxSize: config.llamaCppCtxSize,
    gpuLayers: config.llamaCppGpuLayers,
    startMode: config.llamaCppStartMode
  })
  return new StartupOrchestrator({
    stages: [createDbBootStage(() => getDb()), createLlmBootStage(config, llamaLifecycle)],
    onEvent: broadcast
  })
}

export function registerStartupHandlers(window: BrowserWindow): void {
  mainWindow = window
  orchestrator = buildOrchestrator()

  ipcMain.handle('startup:getState', () => getSnapshot())

  ipcMain.handle('startup:start', async () => {
    if (!orchestrator) {
      orchestrator = buildOrchestrator()
    }
    return orchestrator.start()
  })

  ipcMain.handle('startup:retry', async () => {
    if (!orchestrator) {
      orchestrator = buildOrchestrator()
    }
    return orchestrator.retry()
  })
}

export async function runStartupBoot(): Promise<void> {
  if (!orchestrator) {
    orchestrator = buildOrchestrator()
  }
  await orchestrator.start()
}

export function shutdownStartupRuntime(): Promise<void> {
  return llamaLifecycle?.stop() ?? Promise.resolve()
}

/** Rebuild lifecycle from latest Settings after Save/Apply (020.20). */
export async function reapplyLlamaLifecycleFromSettings(): Promise<void> {
  await llamaLifecycle?.stop()
  orchestrator = buildOrchestrator()
  const config = resolveBootAppConfig()
  if (config.agentProvider === 'llamacpp') {
    await llamaLifecycle?.start()
  }
}

/** @internal test hook */
export function resetStartupForTests(): void {
  orchestrator = undefined
  llamaLifecycle = undefined
  mainWindow = undefined
}
