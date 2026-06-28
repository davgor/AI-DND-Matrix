#!/usr/bin/env node
/**
 * Epic 015.9 — automated startup loading screen smoke tests via Electron CDP.
 * Run: node scripts/startup-smoke.mjs [--skip-package]
 */
import 'dotenv/config'
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ELECTRON = join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe')
const SKIP_PACKAGE = process.argv.includes('--skip-package')
const DEAD_PORT = 59999

const results = []

function log(msg) {
  console.log(`[startup-smoke] ${msg}`)
}

function record(name, pass, notes = '') {
  results.push({ name, pass, notes })
  log(`${pass ? 'PASS' : 'FAIL'}: ${name}${notes ? ` — ${notes}` : ''}`)
}

async function waitForCdp(port, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (res.ok) {
        return true
      }
    } catch {
      // keep polling
    }
    await sleep(500)
  }
  return false
}

async function getPageTarget(port) {
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())
  return targets.find((t) => t.type === 'page')
}

class CdpClient {
  constructor(ws) {
    this.ws = ws
    this.nextId = 1
    this.pending = new Map()
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) {
          reject(new Error(msg.error.message))
        } else {
          resolve(msg.result)
        }
      }
    })
  }

  static async connect(webSocketDebuggerUrl) {
    const ws = new WebSocket(webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true })
      ws.addEventListener('error', reject, { once: true })
    })
    const client = new CdpClient(ws)
    await client.send('Runtime.enable')
    return client
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    })
    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result.exceptionDetails))
    }
    return result.result?.value
  }

  async waitFor(fnExpression, timeoutMs = 60_000, intervalMs = 400) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const value = await this.evaluate(fnExpression)
      if (value) {
        return value
      }
      await sleep(intervalMs)
    }
    throw new Error(`Timeout: ${fnExpression}`)
  }

  close() {
    this.ws.close()
  }
}

function spawnElectron(cdpPort, extraEnv = {}, cwd = ROOT) {
  return spawn(ELECTRON, ['.', `--remote-debugging-port=${cdpPort}`], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...extraEnv }
  })
}

async function killProcess(child) {
  if (!child || child.exitCode !== null) {
    return
  }
  return new Promise((resolve) => {
    child.once('exit', () => resolve())
    child.kill()
    setTimeout(() => {
      try {
        child.kill('SIGKILL')
      } catch {
        // ignore
      }
      resolve()
    }, 4000)
  })
}

async function withCdp(child, cdpPort, fn) {
  const ready = await waitForCdp(cdpPort)
  if (!ready) {
    throw new Error(`CDP :${cdpPort} unavailable`)
  }
  const target = await getPageTarget(cdpPort)
  if (!target?.webSocketDebuggerUrl) {
    throw new Error('No CDP page target')
  }
  const cdp = await CdpClient.connect(target.webSocketDebuggerUrl)
  try {
    return await fn(cdp)
  } finally {
    cdp.close()
  }
}

async function ensureBuilt() {
  log('Building production bundle for smoke...')
  await new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true })
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build failed: ${code}`))))
  })
}

function happyProviderEnv() {
  if (process.env.AGENT_PROVIDER) {
    return { AGENT_PROVIDER: process.env.AGENT_PROVIDER }
  }
  if (process.env.CLAUDE_API_KEY) {
    return { AGENT_PROVIDER: 'claude' }
  }
  return { AGENT_PROVIDER: 'player2' }
}

async function observeBootToShell(cdp) {
  await cdp.waitFor(`(() => !!document.querySelector('.loading-screen'))()`)
  const stages = []
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const title = await cdp.evaluate(`document.querySelector('.loading-screen-title')?.textContent ?? ''`)
    if (title && !stages.includes(title)) {
      stages.push(title)
    }
    const hasSidebar = await cdp.evaluate(`!!document.querySelector('.sidebar')`)
    if (hasSidebar) {
      break
    }
    await sleep(400)
  }
  const shell = await cdp.evaluate(`({
    loading: !!document.querySelector('.loading-screen'),
    sidebar: !!document.querySelector('.sidebar'),
    panel: !!document.querySelector('.main-panel, .play-view')
  })`)
  return { ...shell, stages }
}

async function smokeDevHappy() {
  const port = 9333
  const child = spawnElectron(port, happyProviderEnv())
  try {
    await withCdp(child, port, async (cdp) => {
      const final = await observeBootToShell(cdp)
      const pass = final.sidebar && !final.loading
      record('dev happy path', pass, `stages=${final.stages.join(' → ')}`)
    })
  } finally {
    await killProcess(child)
    await sleep(2000)
  }
}

function listenStub(port) {
  const server = createServer((_req, res) => {
    res.writeHead(200)
    res.end('ok')
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

async function smokeDevFailureRetry() {
  const port = 9334
  const child = spawnElectron(port, {
    AGENT_PROVIDER: 'player2',
    PLAYER2_BASE_URL: `http://127.0.0.1:${DEAD_PORT}`
  })
  let stubServer
  try {
    await withCdp(child, port, async (cdp) => {
      await cdp.waitFor(`(() => !!document.querySelector('.loading-screen-retry'))()`, 60_000)
      const failureTitle = await cdp.evaluate(
        `document.querySelector('.loading-screen-title')?.textContent ?? ''`
      )
      stubServer = await listenStub(DEAD_PORT)
      await sleep(300)
      await cdp.evaluate(`document.querySelector('.loading-screen-retry')?.click()`)
      await cdp.waitFor(`(() => !!document.querySelector('.sidebar'))()`, 60_000)
      const recovered = await cdp.evaluate(`!document.querySelector('.loading-screen')`)
      record('dev failure + retry', recovered, `failure="${failureTitle}"`)
    })
  } finally {
    if (stubServer) {
      await new Promise((resolve) => stubServer.close(resolve))
    }
    await killProcess(child)
    await sleep(2000)
  }
}

async function ensurePackagedExe() {
  const exe = join(ROOT, 'release', 'AI D&D Matrix.exe')
  if (existsSync(exe)) {
    return exe
  }
  if (SKIP_PACKAGE) {
    throw new Error('Packaged exe missing (pass --skip-package to skip)')
  }
  log('Running npm run package (may take several minutes)...')
  await new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'package'], { cwd: ROOT, stdio: 'inherit', shell: true })
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`package failed: ${code}`))))
  })
  if (!existsSync(exe)) {
    throw new Error(`Missing ${exe}`)
  }
  return exe
}

async function smokePackagedHappy() {
  const exe = await ensurePackagedExe()
  const releaseDir = dirname(exe)
  const envPath = join(releaseDir, '.env')
  if (!existsSync(envPath)) {
    copyFileSync(join(ROOT, '.env'), envPath)
  }
  const port = 9335
  const child = spawnElectron(port, happyProviderEnv(), releaseDir)
  try {
    await withCdp(child, port, async (cdp) => {
      const final = await observeBootToShell(cdp)
      record('packaged happy path', final.sidebar && !final.loading, `stages=${final.stages.join(' → ')}`)
    })
  } finally {
    await killProcess(child)
  }
}

async function main() {
  const provider = happyProviderEnv().AGENT_PROVIDER
  log(`Happy-path provider: ${provider}`)
  await ensureBuilt()
  await smokeDevHappy()
  await smokeDevFailureRetry()
  await smokePackagedHappy()

  console.log('\n--- Startup smoke summary ---')
  for (const r of results) {
    console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.notes ? `: ${r.notes}` : ''}`)
  }
  const failed = results.filter((r) => !r.pass)
  if (failed.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('[startup-smoke] Fatal:', error.message)
  process.exit(1)
})
