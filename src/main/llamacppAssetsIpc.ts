import { app, ipcMain, BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { findLlamaCppCatalogEntry } from '../shared/settings/llamaCppCatalog'
import {
  DEFAULT_PROVIDER_SETTINGS,
  type ConnectionCheckResult,
  type ProviderSettings
} from '../shared/settings/types'
import {
  cancelModelDownload,
  downloadCatalogModel,
  type ModelDownloadProgress
} from './llamacpp/modelDownload'
import {
  acquireLlamaCppRuntime,
  discoverLlamaCppRuntime,
  lookupLlamaServerOnPathAsync,
  resolveWindowsRuntimeZipUrl
} from './llamacpp/runtimeAcquire'
import { resolveLlamaCppLifecycleConfig } from './settingsRuntime'
import { loadConfig } from './config'
import {
  createElectronSecretCodec,
  getSettingsFilePath,
  loadSettings,
  saveSettings
} from './settingsStore'
import { reapplyLlamaLifecycleFromSettings, shutdownStartupRuntime } from './startupIpc'

function userDataRoot(): string {
  return app.isPackaged ? app.getPath('userData') : `${process.cwd()}/.data`
}

function broadcastProgress(progress: ModelDownloadProgress): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('llamacpp:downloadProgress', progress)
  }
}

async function startCatalogModelDownload(catalogModelId: string): Promise<{
  ok: true
  modelPath: string
} | { ok: false; message: string }> {
  const entry = findLlamaCppCatalogEntry(catalogModelId)
  if (!entry) {
    return { ok: false, message: `Unknown catalog model: ${catalogModelId}` }
  }
  const filePath = getSettingsFilePath()
  const codec = createElectronSecretCodec()
  try {
    const result = await downloadCatalogModel(
      {
        catalogModelId: entry.id,
        downloadUrl: entry.downloadUrl,
        sha256: entry.sha256,
        userDataRoot: userDataRoot()
      },
      broadcastProgress
    )
    const current = loadSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
    saveSettings(filePath, codec, {
      ...current,
      llamaCppCatalogModelId: entry.id,
      llamaCppDownloadState: 'ready',
      llamaCppModelPath: result.modelPath,
      llamaCppStartMode: current.llamaCppStartMode === 'attach' ? 'managed' : current.llamaCppStartMode
    })
    return { ok: true, modelPath: result.modelPath }
  } catch (error) {
    const current = loadSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
    saveSettings(filePath, codec, {
      ...current,
      llamaCppCatalogModelId: catalogModelId,
      llamaCppDownloadState: 'failed'
    })
    return { ok: false, message: (error as Error).message }
  }
}

async function discoverRuntimeStatus(): Promise<{
  presence: 'path' | 'userData' | 'missing'
  serverPath: string | null
}> {
  const onPath = await lookupLlamaServerOnPathAsync()
  const filePath = getSettingsFilePath()
  const codec = createElectronSecretCodec()
  const settings = loadSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
  return discoverLlamaCppRuntime({
    userDataRoot: userDataRoot(),
    configuredServerPath: settings.llamaCppServerPath,
    pathExists: existsSync,
    lookupOnPath: () => onPath
  })
}

async function acquireRuntime(): Promise<
  { ok: true; serverPath: string } | { ok: false; message: string; recoveryHint: string }
> {
  const filePath = getSettingsFilePath()
  const codec = createElectronSecretCodec()
  try {
    const current = loadSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
    const backend = normalizeRuntimeBackend(current.llamaCppRuntimeBackend)
    const serverPath = await acquireLlamaCppRuntime(
      {
        userDataRoot: userDataRoot(),
        downloadUrl: resolveWindowsRuntimeZipUrl(backend)
      },
      {
        beforeReplace: () => shutdownStartupRuntime()
      }
    )
    saveSettings(filePath, codec, {
      ...current,
      llamaCppRuntimeBackend: backend,
      llamaCppServerPath: serverPath,
      llamaCppStartMode: 'managed'
    })
    return { ok: true, serverPath }
  } catch (error) {
    const recoveryHint =
      'recoveryHint' in (error as object)
        ? String((error as { recoveryHint: string }).recoveryHint)
        : 'Open Settings → retry acquire, or install via winget / GitHub.'
    return { ok: false, message: (error as Error).message, recoveryHint }
  }
}

function normalizeRuntimeBackend(
  value: string | undefined
): ProviderSettings['llamaCppRuntimeBackend'] {
  return value === 'cpu' ? 'cpu' : 'vulkan'
}

async function applyLlamaLifecycleFromSettings(): Promise<ConnectionCheckResult> {
  const env = loadConfig()
  const filePath = getSettingsFilePath()
  const codec = createElectronSecretCodec()
  const persisted = loadSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
  if (persisted.mode !== 'llamacpp') {
    await reapplyLlamaLifecycleFromSettings()
    return { ok: true, message: 'Local provider not selected; lifecycle detached.' }
  }
  try {
    await reapplyLlamaLifecycleFromSettings()
    const life = resolveLlamaCppLifecycleConfig(env, persisted)
    void life
    return { ok: true, message: 'Local llama.cpp lifecycle applied from Settings.' }
  } catch (error) {
    return { ok: false, message: (error as Error).message }
  }
}

export function registerLlamaCppAssetHandlers(): void {
  ipcMain.handle('llamacpp:startModelDownload', (_event, catalogModelId: string) =>
    startCatalogModelDownload(catalogModelId)
  )
  ipcMain.handle('llamacpp:cancelModelDownload', () => {
    cancelModelDownload()
  })
  ipcMain.handle('llamacpp:discoverRuntime', () => discoverRuntimeStatus())
  ipcMain.handle('llamacpp:acquireRuntime', () => acquireRuntime())
  ipcMain.handle('llamacpp:applyLifecycle', () => applyLlamaLifecycleFromSettings())
}
