/**
 * Local RAG model download manager (epic 154.3).
 * Main injects userData root; no Electron imports here.
 */

import { createWriteStream } from 'node:fs'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import {
  getRagLocalCatalogEntry,
  RAG_LOCAL_REFERENCE_MODEL_ID,
  type RagLocalCatalogEntry
} from '../../shared/rag/localCatalog'
import type { RagLocalDownloadState } from '../../shared/rag/embedderSettings'

export interface RagModelDownloadProgress {
  catalogModelId: string
  receivedBytes: number
  totalBytes: number | null
  phase: RagLocalDownloadState
}

export interface RagModelDownloadResult {
  catalogModelId: string
  modelPath: string
  state: 'ready'
}

export interface RagDownloadDeps {
  fetchImpl?: typeof fetch
  onProgress?: (progress: RagModelDownloadProgress) => void
}

interface StateFile {
  catalogModelId: string
  hubModelId: string
  downloadState: RagLocalDownloadState
  modelPath: string
}

function statePath(rootDir: string): string {
  return path.join(rootDir, 'state.json')
}

export function ragEmbedderRoot(userDataPath: string): string {
  return path.join(userDataPath, 'rag-embedder')
}

export async function readRagDownloadState(rootDir: string): Promise<StateFile | null> {
  try {
    const raw = await readFile(statePath(rootDir), 'utf8')
    return JSON.parse(raw) as StateFile
  } catch {
    return null
  }
}

async function writeState(rootDir: string, state: StateFile): Promise<void> {
  await mkdir(rootDir, { recursive: true })
  await writeFile(statePath(rootDir), JSON.stringify(state, null, 2), 'utf8')
}

/**
 * Marks a catalog model ready after assets exist under modelPath.
 * Full hub sync is performed by the neural runtime (Transformers.js cache);
 * this records Settings-facing ready state + marker for tests/CI.
 */
export async function markRagModelReady(
  rootDir: string,
  catalogModelId: string = RAG_LOCAL_REFERENCE_MODEL_ID
): Promise<RagModelDownloadResult> {
  const entry = requireCatalogEntry(catalogModelId)
  const modelPath = path.join(rootDir, 'models', entry.id)
  await mkdir(modelPath, { recursive: true })
  await writeFile(path.join(modelPath, 'READY'), entry.hubModelId, 'utf8')
  await writeState(rootDir, {
    catalogModelId: entry.id,
    hubModelId: entry.hubModelId,
    downloadState: 'ready',
    modelPath
  })
  return { catalogModelId: entry.id, modelPath, state: 'ready' }
}

async function beginRagDownload(
  rootDir: string,
  entry: RagLocalCatalogEntry,
  modelPath: string,
  deps: RagDownloadDeps
): Promise<void> {
  await mkdir(modelPath, { recursive: true })
  await writeState(rootDir, {
    catalogModelId: entry.id,
    hubModelId: entry.hubModelId,
    downloadState: 'downloading',
    modelPath
  })
  deps.onProgress?.({
    catalogModelId: entry.id,
    receivedBytes: 0,
    totalBytes: entry.sizeBytes,
    phase: 'downloading'
  })
}

async function finishRagDownload(
  rootDir: string,
  entry: RagLocalCatalogEntry,
  modelPath: string,
  deps: RagDownloadDeps
): Promise<RagModelDownloadResult> {
  await writeFile(path.join(modelPath, 'READY'), entry.hubModelId, 'utf8')
  await writeState(rootDir, {
    catalogModelId: entry.id,
    hubModelId: entry.hubModelId,
    downloadState: 'ready',
    modelPath
  })
  deps.onProgress?.({
    catalogModelId: entry.id,
    receivedBytes: entry.sizeBytes,
    totalBytes: entry.sizeBytes,
    phase: 'ready'
  })
  return { catalogModelId: entry.id, modelPath, state: 'ready' }
}

async function failRagDownload(
  rootDir: string,
  entry: RagLocalCatalogEntry,
  modelPath: string,
  deps: RagDownloadDeps
): Promise<void> {
  await writeState(rootDir, {
    catalogModelId: entry.id,
    hubModelId: entry.hubModelId,
    downloadState: 'failed',
    modelPath
  })
  deps.onProgress?.({
    catalogModelId: entry.id,
    receivedBytes: 0,
    totalBytes: entry.sizeBytes,
    phase: 'failed'
  })
}

export async function downloadRagCatalogModel(
  rootDir: string,
  catalogModelId: string,
  deps: RagDownloadDeps = {}
): Promise<RagModelDownloadResult> {
  const entry = requireCatalogEntry(catalogModelId)
  const fetchImpl = deps.fetchImpl ?? fetch
  const modelPath = path.join(rootDir, 'models', entry.id)
  await beginRagDownload(rootDir, entry, modelPath, deps)

  try {
    await fetchHubMarker(entry, modelPath, fetchImpl, deps)
    return await finishRagDownload(rootDir, entry, modelPath, deps)
  } catch (error) {
    await failRagDownload(rootDir, entry, modelPath, deps)
    throw error
  }
}

function requireCatalogEntry(catalogModelId: string): RagLocalCatalogEntry {
  const entry = getRagLocalCatalogEntry(catalogModelId)
  if (!entry) {
    throw new Error(`Unknown RAG catalog model "${catalogModelId}"`)
  }
  return entry
}

async function fetchHubMarker(
  entry: RagLocalCatalogEntry,
  modelPath: string,
  fetchImpl: typeof fetch,
  deps: RagDownloadDeps
): Promise<void> {
  const url = `https://huggingface.co/${entry.hubModelId}/resolve/main/config.json`
  const response = await fetchImpl(url)
  if (!response.ok) {
    throw new Error(`RAG model download failed with status ${response.status}`)
  }
  const target = path.join(modelPath, 'config.json')
  if (response.body) {
    const nodeStream = Readable.fromWeb(response.body as never)
    await pipeline(nodeStream, createWriteStream(target))
  } else {
    const text = await response.text()
    await writeFile(target, text, 'utf8')
  }
  deps.onProgress?.({
    catalogModelId: entry.id,
    receivedBytes: entry.sizeBytes,
    totalBytes: entry.sizeBytes,
    phase: 'downloading'
  })
}
