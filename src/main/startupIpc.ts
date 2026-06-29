import { ipcMain, type BrowserWindow } from 'electron'
import { getDb } from './db'
import { loadConfig } from './config'
import { LlamaCppLifecycleManager } from './llamacpp/lifecycle'
import { createDbBootStage, createLlmBootStage } from './startup/bootStages'
import { StartupOrchestrator } from './startup/orchestrator'
import type { StartupEventPayload, StartupFailurePayload, StartupProgressPayload } from '../shared/startup/types'

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

function buildOrchestrator(): StartupOrchestrator {
  const config = loadConfig()
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

/** @internal test hook */
export function resetStartupForTests(): void {
  orchestrator = undefined
  llamaLifecycle = undefined
  mainWindow = undefined
}
