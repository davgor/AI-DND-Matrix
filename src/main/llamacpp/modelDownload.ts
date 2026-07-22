import { createHash, type Hash } from 'node:crypto'
import { createWriteStream, mkdirSync, renameSync, rmSync, type WriteStream } from 'node:fs'
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

interface DownloadToFileResult {
  bytesReceived: number
  sha256Hex: string
}

type ChunkListener = (received: number, total: number | null) => void

/** Minimal writable surface used by streaming download (real fs WriteStream or test double). */
export interface DownloadWriteStream {
  write(chunk: Uint8Array): boolean
  end(cb?: (error?: Error | null) => void): void
  destroy(error?: Error): void
  once(event: 'drain', listener: () => void): void
}

export interface DownloadToFileDeps {
  fetchImpl?: typeof fetch
  openWriteStream?: (filePath: string) => DownloadWriteStream
}

interface ModelDownloadDeps {
  downloadToFile?: (
    url: string,
    destPath: string,
    signal: AbortSignal,
    onChunk: ChunkListener
  ) => Promise<DownloadToFileResult>
  mkdir?: typeof mkdirSync
  rename?: typeof renameSync
  rm?: typeof rmSync
}

type ProgressListener = (progress: ModelDownloadProgress) => void

interface ResolvedDownloadDeps {
  mkdir: typeof mkdirSync
  rename: typeof renameSync
  rm: typeof rmSync
  downloadToFile: NonNullable<ModelDownloadDeps['downloadToFile']>
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

function openDefaultWriteStream(filePath: string): DownloadWriteStream {
  const stream: WriteStream = createWriteStream(filePath)
  return {
    write(chunk: Uint8Array): boolean {
      return stream.write(Buffer.from(chunk))
    },
    end(cb?: (error?: Error | null) => void): void {
      stream.end(cb)
    },
    destroy(error?: Error): void {
      stream.destroy(error)
    },
    once(event: 'drain', listener: () => void): void {
      stream.once(event, listener)
    }
  }
}

function contentLengthTotal(response: Response): number | null {
  const totalHeader = response.headers.get('content-length')
  if (!totalHeader) {
    return null
  }
  const total = Number(totalHeader)
  return Number.isFinite(total) && total > 0 ? total : null
}

async function writeChunkWithBackpressure(
  stream: DownloadWriteStream,
  chunk: Uint8Array
): Promise<void> {
  const ok = stream.write(chunk)
  if (ok) {
    return
  }
  await new Promise<void>((resolve) => {
    stream.once('drain', resolve)
  })
}

async function endWriteStream(stream: DownloadWriteStream): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    stream.end((error?: Error | null) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

interface PumpBodyArgs {
  body: ReadableStream<Uint8Array>
  stream: DownloadWriteStream
  signal: AbortSignal
  total: number | null
  onChunk: ChunkListener
  hash: Hash
}

async function pumpBodyToFile(args: PumpBodyArgs): Promise<number> {
  const reader = args.body.getReader()
  let received = 0
  try {
    for (;;) {
      if (args.signal.aborted) {
        throw new ModelDownloadError('Download cancelled.', 'cancelled')
      }
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (!value || value.byteLength === 0) {
        continue
      }
      args.hash.update(value)
      await writeChunkWithBackpressure(args.stream, value)
      received += value.byteLength
      args.onChunk(received, args.total)
    }
    await endWriteStream(args.stream)
    return received
  } catch (error) {
    args.stream.destroy(error instanceof Error ? error : undefined)
    throw error
  } finally {
    reader.releaseLock()
  }
}

export interface DefaultDownloadToFileArgs {
  url: string
  destPath: string
  signal: AbortSignal
  onChunk: ChunkListener
  deps?: DownloadToFileDeps
}

/**
 * Streams an HTTP response body to disk without buffering the full payload in memory.
 * Exported for unit tests that inject a fake fetch / write stream.
 */
export async function defaultDownloadToFile(
  args: DefaultDownloadToFileArgs
): Promise<DownloadToFileResult> {
  const deps = args.deps ?? {}
  const fetchImpl = deps.fetchImpl ?? fetch
  const openWriteStream = deps.openWriteStream ?? openDefaultWriteStream
  const response = await fetchImpl(args.url, { signal: args.signal })
  if (!response.ok) {
    throw new ModelDownloadError(`Download failed with HTTP ${response.status}.`, 'network')
  }
  if (!response.body) {
    throw new ModelDownloadError('Download response had no body.', 'network')
  }
  const stream = openWriteStream(args.destPath)
  const hash = createHash('sha256')
  try {
    const bytesReceived = await pumpBodyToFile({
      body: response.body,
      stream,
      signal: args.signal,
      total: contentLengthTotal(response),
      onChunk: args.onChunk,
      hash
    })
    return { bytesReceived, sha256Hex: hash.digest('hex') }
  } catch (error) {
    if (error instanceof ModelDownloadError) {
      throw error
    }
    throw new ModelDownloadError(
      `Disk error while writing model: ${(error as Error).message}`,
      'disk'
    )
  }
}

function resolveDownloadDeps(deps: ModelDownloadDeps): ResolvedDownloadDeps {
  return {
    mkdir: deps.mkdir ?? mkdirSync,
    rename: deps.rename ?? renameSync,
    rm: deps.rm ?? rmSync,
    downloadToFile:
      deps.downloadToFile ??
      ((url, destPath, signal, onChunk) =>
        defaultDownloadToFile({ url, destPath, signal, onChunk }))
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
  const downloaded = await fetchModelToFile({
    request,
    abort,
    partialPath: paths.partialPath,
    resolved,
    onProgress
  })
  verifyChecksum(request.sha256, downloaded.sha256Hex)
  try {
    resolved.rename(paths.partialPath, paths.finalPath)
  } catch (error) {
    throw new ModelDownloadError(
      `Disk error while finalizing model: ${(error as Error).message}`,
      'disk'
    )
  }
  onProgress?.({
    catalogModelId: request.catalogModelId,
    phase: 'complete',
    bytesReceived: downloaded.bytesReceived,
    bytesTotal: downloaded.bytesReceived,
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

interface FetchModelToFileArgs {
  request: ModelDownloadRequest
  abort: AbortController
  partialPath: string
  resolved: ResolvedDownloadDeps
  onProgress?: ProgressListener
}

async function fetchModelToFile(args: FetchModelToFileArgs): Promise<DownloadToFileResult> {
  const { request, abort, partialPath, resolved, onProgress } = args
  try {
    return await resolved.downloadToFile(
      request.downloadUrl,
      partialPath,
      abort.signal,
      (received, total) => {
        onProgress?.({
          catalogModelId: request.catalogModelId,
          phase: 'downloading',
          bytesReceived: received,
          bytesTotal: total,
          percent: percentOf(received, total)
        })
      }
    )
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

function verifyChecksum(expected: string, actualHex: string): void {
  const want = expected.trim().toLowerCase()
  if (!want) {
    return
  }
  if (actualHex.toLowerCase() !== want) {
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
