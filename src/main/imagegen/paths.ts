import { join } from 'node:path'
import type { ImageLocalDownloadState } from '../../shared/settings/imageProviderSettings'

type ImageGenAssetErrorCategory =
  | 'missing_runtime'
  | 'missing_model'
  | 'incomplete_download'
  | 'invalid_path'

export class ImageGenAssetError extends Error {
  readonly category: ImageGenAssetErrorCategory
  readonly recoveryHint: string

  constructor(
    message: string,
    category: ImageGenAssetErrorCategory,
    recoveryHint: string
  ) {
    super(message)
    this.category = category
    this.recoveryHint = recoveryHint
  }
}

interface ResolveImageGenAssetPathsInput {
  userDataRoot: string
  serverPath: string
  modelPath: string
  catalogModelId: string
  downloadState: ImageLocalDownloadState
  pathExists: (absolutePath: string) => boolean
}

interface ResolvedImageGenAssetPaths {
  serverPath: string
  modelPath: string
  source: 'manual' | 'catalog'
}

const RECOVERY =
  'Open Settings → Image generation → retry download or acquire runtime, then Save.'

/** Stable subdirectory under Electron userData for models + acquired runtime. */
export const IMAGEGEN_USERDATA_DIR_NAME = 'imagegen'

/** Absolute path to `{userData}/imagegen` — uninstall may delete this tree only. */
export function imagegenRoot(userDataRoot: string): string {
  return join(userDataRoot, IMAGEGEN_USERDATA_DIR_NAME)
}

export function imagegenModelsDir(userDataRoot: string): string {
  return join(imagegenRoot(userDataRoot), 'models')
}

export function imagegenRuntimeDir(userDataRoot: string): string {
  return join(imagegenRoot(userDataRoot), 'runtime')
}

export function defaultAcquiredRuntimePath(userDataRoot: string): string {
  const binary = process.platform === 'win32' ? 'sd-server.exe' : 'sd-server'
  return join(imagegenRuntimeDir(userDataRoot), binary)
}

function isAbsolutePath(path: string): boolean {
  return /^([a-zA-Z]:[\\/]|\/|\\\\)/.test(path)
}

function resolveServerPath(input: ResolveImageGenAssetPathsInput): string {
  const trimmed = input.serverPath.trim()
  if (trimmed && isAbsolutePath(trimmed) && input.pathExists(trimmed)) {
    return trimmed
  }
  const acquired = defaultAcquiredRuntimePath(input.userDataRoot)
  if (input.pathExists(acquired)) {
    return acquired
  }
  if (trimmed) {
    throw new ImageGenAssetError(
      'Configured sd-server path is missing on disk.',
      'invalid_path',
      RECOVERY
    )
  }
  throw new ImageGenAssetError(
    'No sd-server runtime found under Settings paths or userData.',
    'missing_runtime',
    RECOVERY
  )
}

function resolveModelPath(input: ResolveImageGenAssetPathsInput): {
  modelPath: string
  source: 'manual' | 'catalog'
} {
  const trimmed = input.modelPath.trim()
  if (trimmed && isAbsolutePath(trimmed) && input.pathExists(trimmed)) {
    return { modelPath: trimmed, source: 'manual' }
  }
  if (trimmed && isAbsolutePath(trimmed)) {
    throw new ImageGenAssetError(
      'Configured model path is missing on disk.',
      'invalid_path',
      RECOVERY
    )
  }
  return resolveCatalogModel(input)
}

function resolveCatalogModel(input: ResolveImageGenAssetPathsInput): {
  modelPath: string
  source: 'manual' | 'catalog'
} {
  const catalogId = input.catalogModelId.trim()
  if (!catalogId) {
    throw new ImageGenAssetError(
      'No model path or catalog download is configured.',
      'missing_model',
      RECOVERY
    )
  }
  if (input.downloadState !== 'ready') {
    throw new ImageGenAssetError(
      'Catalog model download is incomplete or not ready.',
      'incomplete_download',
      RECOVERY
    )
  }
  const modelPath = join(imagegenModelsDir(input.userDataRoot), catalogId)
  if (!input.pathExists(modelPath)) {
    throw new ImageGenAssetError(
      'Downloaded catalog model directory is missing.',
      'missing_model',
      RECOVERY
    )
  }
  return { modelPath, source: 'catalog' }
}

export function resolveImageGenAssetPaths(
  input: ResolveImageGenAssetPathsInput
): ResolvedImageGenAssetPaths {
  const serverPath = resolveServerPath(input)
  const { modelPath, source } = resolveModelPath(input)
  return { serverPath, modelPath, source }
}
