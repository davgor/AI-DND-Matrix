import { execFile } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { basename as nodeBasename, dirname as nodeDirname, join } from 'node:path'
import { promisify } from 'node:util'
import type { ProviderSettings } from '../../shared/settings/types'
import { defaultAcquiredRuntimePath, llamacppRuntimeDir } from './paths'

const execFileAsync = promisify(execFile)

type LlamaCppRuntimeBackend = ProviderSettings['llamaCppRuntimeBackend']

type RuntimePresence = 'path' | 'userData' | 'missing'

export class LlamaCppRuntimeError extends Error {
  readonly recoveryHint: string

  constructor(message: string, recoveryHint: string) {
    super(message)
    this.name = 'LlamaCppRuntimeError'
    this.recoveryHint = recoveryHint
  }
}

interface DiscoverRuntimeInput {
  userDataRoot: string
  configuredServerPath?: string
  pathExists?: (absolutePath: string) => boolean
  lookupOnPath?: () => string | null
}

interface DiscoverRuntimeResult {
  presence: RuntimePresence
  serverPath: string | null
}

interface AcquireRuntimeInput {
  userDataRoot: string
  downloadUrl: string
}

interface AcquireRuntimeDeps {
  fetchBytes?: (url: string) => Promise<Uint8Array>
  writeFile?: (filePath: string, data: Uint8Array) => void
  mkdir?: typeof mkdirSync
  rm?: typeof rmSync
  extractZip?: (zipPath: string, destDir: string) => Promise<void>
  findBinary?: (rootDir: string) => string | null
  pathExists?: (absolutePath: string) => boolean
  listDir?: (dirPath: string) => string[]
  isDirectory?: (absolutePath: string) => boolean
  copyFile?: (from: string, to: string) => void
  platform?: NodeJS.Platform
  /** Stop managed llama-server before overwriting runtime DLLs (avoids EBUSY). */
  beforeReplace?: () => Promise<void>
}

interface ResolvedAcquireDeps {
  fetchBytes: (url: string) => Promise<Uint8Array>
  writeFile: (filePath: string, data: Uint8Array) => void
  mkdir: typeof mkdirSync
  rm: typeof rmSync
  extractZip: (zipPath: string, destDir: string) => Promise<void>
  findBinary: (rootDir: string) => string | null
  pathExists: (absolutePath: string) => boolean
  listDir: (dirPath: string) => string[]
  isDirectory: (absolutePath: string) => boolean
  copyFile: (from: string, to: string) => void
  platform: NodeJS.Platform
  beforeReplace: () => Promise<void>
}

const RECOVERY =
  'Open Settings → Local → Acquire runtime (or install via winget / GitHub), then Apply.'

/** Pinned llama.cpp release tag for Windows runtime acquire. */
const LLAMACPP_RUNTIME_RELEASE = 'b10069'

/** Resolve the official Windows zip URL for a GPU/CPU backend. */
export function resolveWindowsRuntimeZipUrl(backend: LlamaCppRuntimeBackend): string {
  const artifact =
    backend === 'cpu'
      ? `llama-${LLAMACPP_RUNTIME_RELEASE}-bin-win-cpu-x64.zip`
      : `llama-${LLAMACPP_RUNTIME_RELEASE}-bin-win-vulkan-x64.zip`
  return `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMACPP_RUNTIME_RELEASE}/${artifact}`
}

/** Default Windows acquire target: Vulkan GPU build (CPU selectable in Settings). */
export const DEFAULT_WINDOWS_RUNTIME_ZIP_URL = resolveWindowsRuntimeZipUrl('vulkan')

export function discoverLlamaCppRuntime(input: DiscoverRuntimeInput): DiscoverRuntimeResult {
  const pathExists = input.pathExists ?? existsSync
  const configured = input.configuredServerPath?.trim()
  if (configured && pathExists(configured)) {
    return { presence: 'userData', serverPath: configured }
  }
  const acquired = defaultAcquiredRuntimePath(input.userDataRoot)
  if (pathExists(acquired)) {
    return { presence: 'userData', serverPath: acquired }
  }
  const onPath = (input.lookupOnPath ?? (() => null))()
  if (onPath && pathExists(onPath)) {
    return { presence: 'path', serverPath: onPath }
  }
  return { presence: 'missing', serverPath: null }
}

export async function lookupLlamaServerOnPathAsync(): Promise<string | null> {
  const command = process.platform === 'win32' ? 'where' : 'which'
  const binary = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server'
  try {
    const { stdout } = await execFileAsync(command, [binary])
    const first = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)
    return first ?? null
  } catch {
    return null
  }
}

function resolveAcquireDeps(deps: AcquireRuntimeDeps): ResolvedAcquireDeps {
  return { ...defaultAcquireDeps(), ...pickProvidedAcquireDeps(deps) }
}

const ACQUIRE_DEP_KEYS = [
  'fetchBytes',
  'writeFile',
  'mkdir',
  'rm',
  'extractZip',
  'findBinary',
  'pathExists',
  'listDir',
  'isDirectory',
  'copyFile',
  'platform',
  'beforeReplace'
] as const satisfies ReadonlyArray<keyof AcquireRuntimeDeps>

function pickProvidedAcquireDeps(deps: AcquireRuntimeDeps): Partial<ResolvedAcquireDeps> {
  const next: Partial<ResolvedAcquireDeps> = {}
  for (const key of ACQUIRE_DEP_KEYS) {
    const value = deps[key]
    if (value !== undefined) {
      Object.assign(next, { [key]: value })
    }
  }
  return next
}

function defaultAcquireDeps(): ResolvedAcquireDeps {
  return {
    fetchBytes: defaultFetchBytes,
    writeFile: (path, data) => writeFileSync(path, data),
    mkdir: mkdirSync,
    rm: rmSync,
    extractZip: defaultExtractZip,
    findBinary: findLlamaServerBinary,
    pathExists: existsSync,
    listDir: (dir) => readdirSync(dir),
    isDirectory: (path) => statSync(path).isDirectory(),
    copyFile: (from, to) => copyFileSync(from, to),
    platform: process.platform,
    beforeReplace: async () => undefined
  }
}

function assertAcquireSupported(deps: AcquireRuntimeDeps): void {
  if (process.platform !== 'win32' && !deps.fetchBytes) {
    throw new LlamaCppRuntimeError(
      'Automatic runtime acquire is Windows-first in v1. Install llama-server manually or use Attach mode.',
      RECOVERY
    )
  }
}

export async function acquireLlamaCppRuntime(
  input: AcquireRuntimeInput,
  deps: AcquireRuntimeDeps = {}
): Promise<string> {
  assertAcquireSupported(deps)
  const resolved = resolveAcquireDeps(deps)
  const runtimeDir = llamacppRuntimeDir(input.userDataRoot)
  const stagingDir = join(runtimeDir, '_staging')
  const zipPath = join(runtimeDir, 'runtime-download.zip')
  resolved.mkdir(runtimeDir, { recursive: true })
  resolved.mkdir(stagingDir, { recursive: true })

  try {
    return await installFromZip({
      input,
      ...resolved,
      zipPath,
      stagingDir,
      runtimeDir
    })
  } catch (error) {
    if (error instanceof LlamaCppRuntimeError) {
      throw error
    }
    throw new LlamaCppRuntimeError(
      `Failed to acquire llama-server: ${(error as Error).message}`,
      RECOVERY
    )
  } finally {
    removeQuietly(resolved.rm, zipPath)
    removeQuietly(resolved.rm, stagingDir)
  }
}

interface InstallFromZipArgs extends ResolvedAcquireDeps {
  input: AcquireRuntimeInput
  zipPath: string
  stagingDir: string
  runtimeDir: string
}

function pathBasename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  return parts.at(-1) ?? nodeBasename(filePath)
}

function pathDirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  if (idx <= 0) {
    return nodeDirname(filePath)
  }
  return normalized.slice(0, idx)
}

async function installFromZip(args: InstallFromZipArgs): Promise<string> {
  const bytes = await args.fetchBytes(args.input.downloadUrl)
  args.writeFile(args.zipPath, bytes)
  await args.extractZip(args.zipPath, args.stagingDir)
  const found = args.findBinary(args.stagingDir)
  if (!found) {
    throw new LlamaCppRuntimeError(
      'Downloaded runtime archive did not contain llama-server.',
      RECOVERY
    )
  }
  await args.beforeReplace()
  clearInstalledRuntimeFiles(args)
  copyDirContents(pathDirname(found), args.runtimeDir, args)
  const target = join(args.runtimeDir, pathBasename(found))
  assertRuntimePayloadComplete(args, target)
  return target
}

function clearInstalledRuntimeFiles(args: InstallFromZipArgs): void {
  for (const name of args.listDir(args.runtimeDir)) {
    if (name === '_staging' || name === 'runtime-download.zip') {
      continue
    }
    removeQuietly(args.rm, join(args.runtimeDir, name))
  }
}

function copyDirContents(
  fromDir: string,
  toDir: string,
  args: Pick<ResolvedAcquireDeps, 'listDir' | 'isDirectory' | 'mkdir' | 'copyFile'>
): void {
  args.mkdir(toDir, { recursive: true })
  for (const name of args.listDir(fromDir)) {
    const from = join(fromDir, name)
    const to = join(toDir, name)
    if (args.isDirectory(from)) {
      copyDirContents(from, to, args)
      continue
    }
    args.copyFile(from, to)
  }
}

function assertRuntimePayloadComplete(args: InstallFromZipArgs, binaryPath: string): void {
  if (!args.pathExists(binaryPath)) {
    throw new LlamaCppRuntimeError('Failed to install acquired llama-server binary.', RECOVERY)
  }
  if (args.platform !== 'win32') {
    return
  }
  const dlls = args
    .listDir(args.runtimeDir)
    .filter((name) => name.toLowerCase().endsWith('.dll'))
  if (dlls.length === 0) {
    throw new LlamaCppRuntimeError(
      'Runtime install is missing required DLLs next to llama-server.exe. Re-acquire the runtime package.',
      RECOVERY
    )
  }
}

async function defaultFetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

async function defaultExtractZip(zipPath: string, destDir: string): Promise<void> {
  await execFileAsync('tar', ['-xf', zipPath, '-C', destDir])
}

function findLlamaServerBinary(rootDir: string): string | null {
  const wanted = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server'
  const stack = [rootDir]
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const name of readdirSync(current)) {
      const full = join(current, name)
      if (statSync(full).isDirectory()) {
        stack.push(full)
      } else if (name.toLowerCase() === wanted.toLowerCase()) {
        return full
      }
    }
  }
  return null
}

function removeQuietly(rm: typeof rmSync, path: string): void {
  try {
    rm(path, { recursive: true, force: true })
  } catch {
    // best-effort
  }
}
