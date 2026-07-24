import { app, ipcMain, BrowserWindow } from 'electron'
import {
  DEFAULT_RAG_EMBEDDER_SETTINGS,
  isRagEmbedderReady,
  type RagEmbedderSettings
} from '../../shared/rag/embedderSettings'
import { RAG_LOCAL_CATALOG, RAG_LOCAL_REFERENCE_MODEL_ID } from '../../shared/rag/localCatalog'
import { DEFAULT_PROVIDER_SETTINGS } from '../../shared/settings/types'
import {
  createElectronSecretCodec,
  getSettingsFilePath,
  loadSettings,
  saveSettings
} from '../settingsStore'
import {
  downloadRagCatalogModel,
  getRagModelStatus,
  ragEmbedderRoot,
  type RagModelDownloadProgress
} from './modelDownload'

function userDataRoot(): string {
  return app.isPackaged ? app.getPath('userData') : `${process.cwd()}/.data`
}

function broadcastProgress(progress: RagModelDownloadProgress): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('rag:downloadProgress', progress)
  }
}

export interface RagEmbedderStatusSnapshot {
  ragEmbedder: RagEmbedderSettings
  catalog: typeof RAG_LOCAL_CATALOG
  diskReady: boolean
  ready: boolean
  reason: string
  openaiApiKeySet: boolean
  geminiApiKeySet: boolean
}

async function buildStatusSnapshot(): Promise<RagEmbedderStatusSnapshot> {
  const filePath = getSettingsFilePath()
  const codec = createElectronSecretCodec()
  const settings = loadSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
  const ragEmbedder = settings.ragEmbedder ?? { ...DEFAULT_RAG_EMBEDDER_SETTINGS }
  const disk = await getRagModelStatus(ragEmbedderRoot(userDataRoot()))
  const keys = {
    openaiApiKeySet: settings.openaiApiKey.trim().length > 0,
    geminiApiKeySet: settings.geminiApiKey.trim().length > 0
  }
  const readiness = isRagEmbedderReady(ragEmbedder, keys)
  return {
    ragEmbedder,
    catalog: RAG_LOCAL_CATALOG,
    diskReady: disk.ready,
    ready: readiness.ready,
    reason: readiness.reason,
    openaiApiKeySet: keys.openaiApiKeySet,
    geminiApiKeySet: keys.geminiApiKeySet
  }
}

async function startRagModelDownload(catalogModelId?: string): Promise<
  { ok: true; modelPath: string } | { ok: false; message: string }
> {
  const id = catalogModelId?.trim() || RAG_LOCAL_REFERENCE_MODEL_ID
  const filePath = getSettingsFilePath()
  const codec = createElectronSecretCodec()
  const root = ragEmbedderRoot(userDataRoot())
  try {
    const current = loadSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
    saveSettings(filePath, codec, {
      ...current,
      ragEmbedder: {
        ...(current.ragEmbedder ?? DEFAULT_RAG_EMBEDDER_SETTINGS),
        localCatalogModelId: id,
        localDownloadState: 'downloading'
      }
    })
    const result = await downloadRagCatalogModel(root, id, {
      onProgress: broadcastProgress
    })
    const after = loadSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
    saveSettings(filePath, codec, {
      ...after,
      ragEmbedder: {
        ...(after.ragEmbedder ?? DEFAULT_RAG_EMBEDDER_SETTINGS),
        localCatalogModelId: id,
        localDownloadState: 'ready',
        localModelPath: result.modelPath
      }
    })
    return { ok: true, modelPath: result.modelPath }
  } catch (error) {
    const current = loadSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
    saveSettings(filePath, codec, {
      ...current,
      ragEmbedder: {
        ...(current.ragEmbedder ?? DEFAULT_RAG_EMBEDDER_SETTINGS),
        localCatalogModelId: id,
        localDownloadState: 'failed'
      }
    })
    return { ok: false, message: (error as Error).message }
  }
}

export function registerRagEmbedderHandlers(): void {
  ipcMain.handle('rag:getStatus', () => buildStatusSnapshot())
  ipcMain.handle('rag:startModelDownload', (_event, catalogModelId?: string) =>
    startRagModelDownload(catalogModelId)
  )
}
