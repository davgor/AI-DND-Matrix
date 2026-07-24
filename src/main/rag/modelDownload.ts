/**
 * Local RAG model download manager (epic 154.3).
 * Main injects userData root; no Electron imports here.
 */

import { createWriteStream } from 'node:fs'
import { access, mkdir, writeFile, readFile } from 'node:fs/promises'
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

export interface RagModelStatus {
  catalogModelId: string | null
  hubModelId: string | null
  downloadState: RagLocalDownloadState
  modelPath: string
  ready: boolean
}

interface StateFile {
  catalogModelId: string
  hubModelId: string
  downloadState: RagLocalDownloadState
  modelPath: string
}

/** Hub-relative paths required for Transformers.js local_files_only load. */
export const RAG_HUB_REQUIRED_FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/model_quantized.onnx'
] as const

export const RAG_HUB_OPTIONAL_FILES = ['tokenizer.model', 'onnx/model.onnx'] as const

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

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export async function isRagModelReady(
  rootDir: string,
  catalogModelId: string = RAG_LOCAL_REFERENCE_MODEL_ID
): Promise<boolean> {
  const entry = getRagLocalCatalogEntry(catalogModelId)
  if (!entry) {
    return false
  }
  const modelPath = path.join(rootDir, 'models', entry.id)
  const readyMarker = path.join(modelPath, 'READY')
  if (!(await pathExists(readyMarker))) {
    return false
  }
  for (const relative of RAG_HUB_REQUIRED_FILES) {
    if (!(await pathExists(path.join(modelPath, relative)))) {
      return false
    }
  }
  return true
}

export async function getRagModelStatus(rootDir: string): Promise<RagModelStatus> {
  const state = await readRagDownloadState(rootDir)
  if (!state) {
    return {
      catalogModelId: null,
      hubModelId: null,
      downloadState: 'idle',
      modelPath: '',
      ready: false
    }
  }
  const ready =
    state.downloadState === 'ready' &&
    (await isRagModelReady(rootDir, state.catalogModelId))
  return {
    catalogModelId: state.catalogModelId,
    hubModelId: state.hubModelId,
    downloadState: ready ? 'ready' : state.downloadState === 'ready' ? 'failed' : state.downloadState,
    modelPath: state.modelPath,
    ready
  }
}

/**
 * Marks a catalog model ready after assets exist under modelPath.
 */
export async function markRagModelReady(
  rootDir: string,
  catalogModelId: string = RAG_LOCAL_REFERENCE_MODEL_ID
): Promise<RagModelDownloadResult> {
  const entry = requireCatalogEntry(catalogModelId)
  const modelPath = path.join(rootDir, 'models', entry.id)
  await mkdir(path.join(modelPath, 'onnx'), { recursive: true })
  for (const relative of RAG_HUB_REQUIRED_FILES) {
    const target = path.join(modelPath, relative)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, `fixture:${relative}`, 'utf8')
  }
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
    await downloadHubFiles(entry, modelPath, fetchImpl, deps)
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

async function downloadHubFiles(
  entry: RagLocalCatalogEntry,
  modelPath: string,
  fetchImpl: typeof fetch,
  deps: RagDownloadDeps
): Promise<void> {
  let received = 0
  for (const relative of RAG_HUB_REQUIRED_FILES) {
    const bytes = await fetchHubFile({ entry, modelPath, relative, fetchImpl, optional: false })
    received += bytes
    deps.onProgress?.({
      catalogModelId: entry.id,
      receivedBytes: received,
      totalBytes: entry.sizeBytes,
      phase: 'downloading'
    })
  }
  for (const relative of RAG_HUB_OPTIONAL_FILES) {
    try {
      const bytes = await fetchHubFile({ entry, modelPath, relative, fetchImpl, optional: true })
      received += bytes
    } catch {
      /* optional */
    }
  }
}

async function fetchHubFile(input: {
  entry: RagLocalCatalogEntry
  modelPath: string
  relative: string
  fetchImpl: typeof fetch
  optional: boolean
}): Promise<number> {
  const url = `https://huggingface.co/${input.entry.hubModelId}/resolve/main/${input.relative}`
  const response = await input.fetchImpl(url)
  if (!response.ok) {
    if (input.optional) {
      return 0
    }
    throw new Error(
      `RAG model download failed for ${input.relative} with status ${response.status}`
    )
  }
  const target = path.join(input.modelPath, input.relative)
  await mkdir(path.dirname(target), { recursive: true })
  if (response.body) {
    const nodeStream = Readable.fromWeb(response.body as never)
    await pipeline(nodeStream, createWriteStream(target))
  } else {
    const buffer = Buffer.from(await response.arrayBuffer())
    await writeFile(target, buffer)
  }
  const sizeHeader = response.headers.get('content-length')
  return sizeHeader ? Number(sizeHeader) : 1
}
