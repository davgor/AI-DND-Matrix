/**
 * Retry wrapper for `npm ci` on CI runners.
 *
 * Windows Actions flakes we harden against:
 * - intermittent EBUSY/EPERM during extract
 * - Electron Chromium download inside package.json `postinstall`
 *   (CI jobs that need Electron re-run install.js explicitly)
 */
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

export const DEFAULT_ATTEMPTS = 3
export const DEFAULT_DELAY_MS = 10_000

export function buildNpmCiEnv(baseEnv = process.env) {
  return {
    ...baseEnv,
    ELECTRON_SKIP_BINARY_DOWNLOAD: '1'
  }
}

/**
 * @param {object} opts
 * @param {(cmd: string, args: string[], env: NodeJS.ProcessEnv) => Promise<{ code: number }>} opts.runCommand
 * @param {() => Promise<void>} opts.rmNodeModules
 * @param {(ms: number) => Promise<void>} opts.sleep
 * @param {(msg: string) => void} [opts.log]
 * @param {number} [opts.attempts]
 * @param {number} [opts.delayMs]
 * @param {NodeJS.ProcessEnv} [opts.env]
 */
export async function runNpmCiWithRetry({
  runCommand,
  rmNodeModules,
  sleep,
  log = console.log,
  attempts = DEFAULT_ATTEMPTS,
  delayMs = DEFAULT_DELAY_MS,
  env = buildNpmCiEnv(process.env)
}) {
  let lastCode = 1
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { code } = await runCommand('npm', ['ci'], env)
    lastCode = code
    if (code === 0) {
      return { attempts: attempt }
    }
    log(`npm ci attempt ${attempt}/${attempts} failed with exit code ${code}`)
    if (attempt === attempts) {
      break
    }
    await rmNodeModules()
    await sleep(delayMs)
  }
  throw new Error(`npm ci failed after ${attempts} attempts (last exit code ${lastCode})`)
}

function spawnCommand(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })
    child.on('exit', (code, signal) => {
      if (signal) {
        resolve({ code: 1 })
        return
      }
      resolve({ code: code ?? 1 })
    })
  })
}

async function rmNodeModules(root = process.cwd()) {
  await rm(join(root, 'node_modules'), { recursive: true, force: true })
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node scripts/npm-ci-with-retry.mjs')
    return 0
  }
  await runNpmCiWithRetry({
    runCommand: spawnCommand,
    rmNodeModules: () => rmNodeModules(),
    sleep: delay
  })
  return 0
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('npm-ci-with-retry.mjs') ||
    process.argv[1].replace(/\\/g, '/').endsWith('scripts/npm-ci-with-retry.mjs'))

if (isDirectRun) {
  main()
    .then((code) => {
      process.exitCode = code
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err)
      process.exitCode = 1
    })
}
