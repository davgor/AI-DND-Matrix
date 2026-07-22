import { join } from 'node:path'
import type { LlamaCppDownloadState } from '../../shared/settings/types'

type LlamaCppAssetErrorCategory =
  | 'missing_runtime'
  | 'missing_model'
  | 'incomplete_download'
  | 'invalid_path'

export class LlamaCppAssetError extends Error {
  readonly category: LlamaCppAssetErrorCategory
  readonly recoveryHint: string

  constructor(
    message: string,
    category: LlamaCppAssetErrorCategory,
    recoveryHint: string
  ) {
    super(message)
    this.category = category
    this.recoveryHint = recoveryHint
  }
}

interface ResolveLlamaCppAssetPathsInput {
  userDataRoot: string
  serverPath: string
  modelPath: string
  catalogModelId: string
  downloadState: LlamaCppDownloadState
  pathExists: (absolutePath: string) => boolean
}

interface ResolvedLlamaCppAssetPaths {
  serverPath: string
  modelPath: string
  source: 'manual' | 'catalog'
}

const RECOVERY =
  'Open Settings → Local → retry download or acquire runtime, then Apply.'

function llamacppRoot(userDataRoot: string): string {
  return join(userDataRoot, 'llamacpp')
}

export function llamacppModelsDir(userDataRoot: string): string {
  return join(llamacppRoot(userDataRoot), 'models')
}

export function llamacppRuntimeDir(userDataRoot: string): string {
  return join(llamacppRoot(userDataRoot), 'runtime')
}

export function catalogModelFileName(catalogModelId: string): string {
  return `${catalogModelId}.gguf`
}

export function defaultAcquiredRuntimePath(userDataRoot: string): string {
  const binary = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server'
  return join(llamacppRuntimeDir(userDataRoot), binary)
}

function isAbsolutePath(path: string): boolean {
  return /^([a-zA-Z]:[\\/]|\/|\\\\)/.test(path)
}

function resolveServerPath(input: ResolveLlamaCppAssetPathsInput): string {
  const trimmed = input.serverPath.trim()
  if (trimmed && isAbsolutePath(trimmed) && input.pathExists(trimmed)) {
    return trimmed
  }
  const acquired = defaultAcquiredRuntimePath(input.userDataRoot)
  if (input.pathExists(acquired)) {
    return acquired
  }
  if (trimmed) {
    throw new LlamaCppAssetError(
      'Configured llama-server path is missing on disk.',
      'invalid_path',
      RECOVERY
    )
  }
  throw new LlamaCppAssetError(
    'No llama-server runtime found under Settings paths or userData.',
    'missing_runtime',
    RECOVERY
  )
}

function resolveModelPath(input: ResolveLlamaCppAssetPathsInput): {
  modelPath: string
  source: 'manual' | 'catalog'
} {
  const trimmed = input.modelPath.trim()
  if (trimmed && isAbsolutePath(trimmed) && input.pathExists(trimmed)) {
    return { modelPath: trimmed, source: 'manual' }
  }
  if (trimmed && isAbsolutePath(trimmed)) {
    throw new LlamaCppAssetError(
      'Configured model path is missing on disk.',
      'invalid_path',
      RECOVERY
    )
  }
  return resolveCatalogModel(input)
}

function resolveCatalogModel(input: ResolveLlamaCppAssetPathsInput): {
  modelPath: string
  source: 'manual' | 'catalog'
} {
  const catalogId = input.catalogModelId.trim()
  if (!catalogId) {
    throw new LlamaCppAssetError(
      'No model path or catalog download is configured.',
      'missing_model',
      RECOVERY
    )
  }
  if (input.downloadState !== 'ready') {
    throw new LlamaCppAssetError(
      'Catalog model download is incomplete or not ready.',
      'incomplete_download',
      RECOVERY
    )
  }
  const modelPath = join(llamacppModelsDir(input.userDataRoot), catalogModelFileName(catalogId))
  if (!input.pathExists(modelPath)) {
    throw new LlamaCppAssetError(
      'Downloaded catalog model file is missing.',
      'missing_model',
      RECOVERY
    )
  }
  return { modelPath, source: 'catalog' }
}

export function resolveLlamaCppAssetPaths(
  input: ResolveLlamaCppAssetPathsInput
): ResolvedLlamaCppAssetPaths {
  const serverPath = resolveServerPath(input)
  const { modelPath, source } = resolveModelPath(input)
  return { serverPath, modelPath, source }
}
