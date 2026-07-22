import { execFile } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { defaultAcquiredRuntimePath, llamacppRuntimeDir } from './paths'

const execFileAsync = promisify(execFile)

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
  rename?: typeof renameSync
  extractZip?: (zipPath: string, destDir: string) => Promise<void>
  findBinary?: (rootDir: string) => string | null
  pathExists?: (absolutePath: string) => boolean
}

interface ResolvedAcquireDeps {
  fetchBytes: (url: string) => Promise<Uint8Array>
  writeFile: (filePath: string, data: Uint8Array) => void
  mkdir: typeof mkdirSync
  rm: typeof rmSync
  rename: typeof renameSync
  extractZip: (zipPath: string, destDir: string) => Promise<void>
  findBinary: (rootDir: string) => string | null
  pathExists: (absolutePath: string) => boolean
}

const RECOVERY =
  'Open Settings → Local → Acquire runtime (or install via winget / GitHub), then Apply.'

/** Pinned Windows CPU runtime zip for v1 acquire (update when bumping smoke baseline). */
export const DEFAULT_WINDOWS_RUNTIME_ZIP_URL =
  'https://github.com/ggml-org/llama.cpp/releases/download/b10069/llama-b10069-bin-win-cpu-x64.zip'

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
  return {
    fetchBytes: deps.fetchBytes ?? defaultFetchBytes,
    writeFile: deps.writeFile ?? ((path, data) => writeFileSync(path, data)),
    mkdir: deps.mkdir ?? mkdirSync,
    rm: deps.rm ?? rmSync,
    rename: deps.rename ?? renameSync,
    extractZip: deps.extractZip ?? defaultExtractZip,
    findBinary: deps.findBinary ?? findLlamaServerBinary,
    pathExists: deps.pathExists ?? existsSync
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
      stagingDir
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

async function installFromZip(args: {
  input: AcquireRuntimeInput
  fetchBytes: (url: string) => Promise<Uint8Array>
  writeFile: (filePath: string, data: Uint8Array) => void
  extractZip: (zipPath: string, destDir: string) => Promise<void>
  findBinary: (rootDir: string) => string | null
  rename: typeof renameSync
  pathExists: (absolutePath: string) => boolean
  zipPath: string
  stagingDir: string
}): Promise<string> {
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
  const target = defaultAcquiredRuntimePath(args.input.userDataRoot)
  args.rename(found, target)
  if (!args.pathExists(target)) {
    throw new LlamaCppRuntimeError('Failed to install acquired llama-server binary.', RECOVERY)
  }
  return target
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
