import { createHash } from 'node:crypto'
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { catalogModelFileName, llamacppModelsDir } from './paths'

type ModelDownloadPhase = 'idle' | 'downloading' | 'complete' | 'failed' | 'cancelled'

type ModelDownloadErrorCategory = 'network' | 'disk' | 'checksum' | 'cancelled'

export class ModelDownloadError extends Error {
  readonly category: ModelDownloadErrorCategory

  constructor(message: string, category: ModelDownloadErrorCategory) {
    super(message)
    this.name = 'ModelDownloadError'
    this.category = category
  }
}

export interface ModelDownloadProgress {
  catalogModelId: string
  phase: ModelDownloadPhase
  bytesReceived: number
  bytesTotal: number | null
  percent: number | null
  errorMessage?: string
}

interface ModelDownloadRequest {
  catalogModelId: string
  downloadUrl: string
  sha256: string
  userDataRoot: string
}

interface ModelDownloadResult {
  modelPath: string
  catalogModelId: string
}

interface ModelDownloadDeps {
  fetchBytes?: (
    url: string,
    signal: AbortSignal,
    onChunk: (received: number, total: number | null) => void
  ) => Promise<Uint8Array>
  writeFile?: (filePath: string, data: Uint8Array) => void
  mkdir?: typeof mkdirSync
  rename?: typeof renameSync
  rm?: typeof rmSync
  sha256Of?: (data: Uint8Array) => string
}

type ProgressListener = (progress: ModelDownloadProgress) => void

interface ResolvedDownloadDeps {
  mkdir: typeof mkdirSync
  writeFile: (filePath: string, data: Uint8Array) => void
  rename: typeof renameSync
  rm: typeof rmSync
  fetchBytes: NonNullable<ModelDownloadDeps['fetchBytes']>
  sha256Of: (data: Uint8Array) => string
}

let activeAbort: AbortController | null = null
let activeCatalogId: string | null = null

export function getActiveModelDownloadId(): string | null {
  return activeCatalogId
}

export function cancelModelDownload(): void {
  activeAbort?.abort()
}

function percentOf(received: number, total: number | null): number | null {
  if (total == null || total <= 0) {
    return null
  }
  return Math.min(100, Math.round((received / total) * 100))
}

function defaultSha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

async function defaultFetchBytes(
  url: string,
  signal: AbortSignal,
  onChunk: (received: number, total: number | null) => void
): Promise<Uint8Array> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new ModelDownloadError(`Download failed with HTTP ${response.status}.`, 'network')
  }
  const totalHeader = response.headers.get('content-length')
  const total = totalHeader ? Number(totalHeader) : null
  const buffer = new Uint8Array(await response.arrayBuffer())
  onChunk(buffer.byteLength, total)
  return buffer
}

function resolveDownloadDeps(deps: ModelDownloadDeps): ResolvedDownloadDeps {
  return {
    mkdir: deps.mkdir ?? mkdirSync,
    writeFile: deps.writeFile ?? ((path, data) => writeFileSync(path, data)),
    rename: deps.rename ?? renameSync,
    rm: deps.rm ?? rmSync,
    fetchBytes: deps.fetchBytes ?? defaultFetchBytes,
    sha256Of: deps.sha256Of ?? defaultSha256
  }
}

function beginDownloadSession(catalogModelId: string): AbortController {
  if (activeAbort) {
    throw new ModelDownloadError('A model download is already in progress.', 'network')
  }
  const abort = new AbortController()
  activeAbort = abort
  activeCatalogId = catalogModelId
  return abort
}

function endDownloadSession(): void {
  activeAbort = null
  activeCatalogId = null
}

function emitDownloading(
  catalogModelId: string,
  onProgress?: ProgressListener
): void {
  onProgress?.({
    catalogModelId,
    phase: 'downloading',
    bytesReceived: 0,
    bytesTotal: null,
    percent: null
  })
}

interface WriteVerifiedArgs {
  request: ModelDownloadRequest
  abort: AbortController
  paths: { modelsDir: string; finalPath: string; partialPath: string }
  resolved: ResolvedDownloadDeps
  onProgress?: ProgressListener
}

async function writeVerifiedModel(args: WriteVerifiedArgs): Promise<ModelDownloadResult> {
  const { request, abort, paths, resolved, onProgress } = args
  resolved.mkdir(paths.modelsDir, { recursive: true })
  emitDownloading(request.catalogModelId, onProgress)
  const bytes = await fetchModelBytes(request, abort, resolved.fetchBytes, onProgress)
  writePartial(resolved.writeFile, paths.partialPath, bytes)
  verifyChecksum(request.sha256, bytes, resolved.sha256Of)
  resolved.rename(paths.partialPath, paths.finalPath)
  onProgress?.({
    catalogModelId: request.catalogModelId,
    phase: 'complete',
    bytesReceived: bytes.byteLength,
    bytesTotal: bytes.byteLength,
    percent: 100
  })
  return { modelPath: paths.finalPath, catalogModelId: request.catalogModelId }
}

interface FailDownloadArgs {
  request: ModelDownloadRequest
  error: unknown
  aborted: boolean
  partialPath: string
  rm: typeof rmSync
  onProgress?: ProgressListener
}

function failDownload(args: FailDownloadArgs): never {
  removeQuietly(args.rm, args.partialPath)
  const typed = toDownloadError(args.error, args.aborted)
  args.onProgress?.({
    catalogModelId: args.request.catalogModelId,
    phase: typed.category === 'cancelled' ? 'cancelled' : 'failed',
    bytesReceived: 0,
    bytesTotal: null,
    percent: null,
    errorMessage: typed.message
  })
  throw typed
}

export async function downloadCatalogModel(
  request: ModelDownloadRequest,
  onProgress?: ProgressListener,
  deps: ModelDownloadDeps = {}
): Promise<ModelDownloadResult> {
  const abort = beginDownloadSession(request.catalogModelId)
  const resolved = resolveDownloadDeps(deps)
  const modelsDir = llamacppModelsDir(request.userDataRoot)
  const finalPath = join(modelsDir, catalogModelFileName(request.catalogModelId))
  const partialPath = `${finalPath}.partial`
  try {
    return await writeVerifiedModel({
      request,
      abort,
      paths: { modelsDir, finalPath, partialPath },
      resolved,
      onProgress
    })
  } catch (error) {
    return failDownload({
      request,
      error,
      aborted: abort.signal.aborted,
      partialPath,
      rm: resolved.rm,
      onProgress
    })
  } finally {
    endDownloadSession()
  }
}

async function fetchModelBytes(
  request: ModelDownloadRequest,
  abort: AbortController,
  fetchBytes: NonNullable<ModelDownloadDeps['fetchBytes']>,
  onProgress?: ProgressListener
): Promise<Uint8Array> {
  try {
    return await fetchBytes(request.downloadUrl, abort.signal, (received, total) => {
      onProgress?.({
        catalogModelId: request.catalogModelId,
        phase: 'downloading',
        bytesReceived: received,
        bytesTotal: total,
        percent: percentOf(received, total)
      })
    })
  } catch (error) {
    if (abort.signal.aborted) {
      throw new ModelDownloadError('Download cancelled.', 'cancelled')
    }
    if (error instanceof ModelDownloadError) {
      throw error
    }
    throw new ModelDownloadError(
      `Network error while downloading model: ${(error as Error).message}`,
      'network'
    )
  }
}

function writePartial(
  writeFile: (filePath: string, data: Uint8Array) => void,
  partialPath: string,
  bytes: Uint8Array
): void {
  try {
    writeFile(partialPath, bytes)
  } catch (error) {
    throw new ModelDownloadError(
      `Disk error while writing model: ${(error as Error).message}`,
      'disk'
    )
  }
}

function verifyChecksum(
  expected: string,
  bytes: Uint8Array,
  sha256Of: (data: Uint8Array) => string
): void {
  const want = expected.trim().toLowerCase()
  if (!want) {
    return
  }
  if (sha256Of(bytes).toLowerCase() !== want) {
    throw new ModelDownloadError(
      'Downloaded model failed integrity check (checksum mismatch).',
      'checksum'
    )
  }
}

function removeQuietly(rm: typeof rmSync, path: string): void {
  try {
    rm(path, { force: true })
  } catch {
    // best-effort
  }
}

function toDownloadError(error: unknown, aborted: boolean): ModelDownloadError {
  if (aborted) {
    return new ModelDownloadError('Download cancelled.', 'cancelled')
  }
  if (error instanceof ModelDownloadError) {
    return error
  }
  return new ModelDownloadError((error as Error).message, 'network')
}
