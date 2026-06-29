#!/usr/bin/env node
/**
 * Epic 017.10 — automated campaign-start modal + loading flow smoke tests via Electron CDP.
 * Run: node scripts/campaign-start-smoke.mjs [--skip-package]
 */
import 'dotenv/config'
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, readdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import { APP_EXE_NAME } from './appProduct.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ELECTRON = join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe')
const SKIP_PACKAGE = process.argv.includes('--skip-package')
const PACKAGED_ONLY = process.argv.includes('--packaged-only')
const STUB_PORT = 54321

const VALID_GENERATION = JSON.stringify({
  regions: [
    { name: 'Oakhollow', description: 'A quiet logging village.', historyBackstory: 'Founded a century ago.' },
    { name: 'The Sunken Crown', description: 'A flooded ruin.', historyBackstory: 'Once a royal seat.' }
  ],
  npcs: [
    { name: 'Mira the Woodcutter', role: 'shopkeeper', disposition: 'friendly', regionName: 'Oakhollow' },
    { name: 'The Drowned King', role: 'boss', disposition: 'hostile', regionName: 'The Sunken Crown' }
  ],
  storyThread: { title: 'The Crown Beneath the Waves', state: 'starting', summary: 'A throne lies hidden.' }
})

const results = []

function log(msg) {
  console.log(`[campaign-start-smoke] ${msg}`)
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

  async waitFor(fnExpression, timeoutMs = 120_000, intervalMs = 500) {
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

function spawnPackagedExe(exePath, cdpPort, extraEnv = {}) {
  return spawn(exePath, [`--remote-debugging-port=${cdpPort}`], {
    cwd: dirname(exePath),
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
  log('Rebuilding native modules for Electron...')
  await new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'rebuild:electron'], { cwd: ROOT, stdio: 'inherit', shell: true })
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`rebuild:electron failed: ${code}`))))
  })
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

function stubPlayer2Env() {
  return {
    AGENT_PROVIDER: 'player2',
    PLAYER2_BASE_URL: `http://127.0.0.1:${STUB_PORT}`
  }
}

function createPlayer2Stub(initialChatStatus = 200) {
  let chatStatus = initialChatStatus
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${STUB_PORT}`)
    if (req.method === 'GET' && url.pathname === '/v1/models') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ object: 'list', data: [{ id: 'stub', object: 'model' }] }))
      return
    }
    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      res.writeHead(chatStatus, { 'content-type': 'application/json' })
      if (chatStatus === 200) {
        res.end(
          JSON.stringify({
            choices: [{ message: { role: 'assistant', content: VALID_GENERATION } }]
          })
        )
      } else {
        res.end('error')
      }
      return
    }
    res.writeHead(404)
    res.end()
  })
  return {
    server,
    setChatStatus(next) {
      chatStatus = next
    },
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(STUB_PORT, '127.0.0.1', () => resolve())
      })
    },
    close() {
      return new Promise((resolve) => server.close(resolve))
    }
  }
}

async function waitForAppShell(cdp) {
  await cdp.waitFor(`(() => !!document.querySelector('.sidebar'))()`, 90_000)
  await cdp.evaluate(`(() => {
    if (document.querySelector('.sidebar-collapsed')) {
      document.querySelector('.sidebar-toggle')?.click()
    }
  })()`)
}

async function setReactTextareaValue(cdp, selector, value) {
  await cdp.evaluate(
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return false
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
      setter?.call(el, ${JSON.stringify(value)})
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return el.value === ${JSON.stringify(value)}
    })()`
  )
}

async function runCampaignCreateFlow(cdp) {
  await cdp.evaluate(`document.querySelector('.sidebar-new-campaign-button')?.click()`)
  await cdp.waitFor(`(() => !!document.querySelector('.campaign-start-modal'))()`)
  await setReactTextareaValue(cdp, '.campaign-start-modal textarea', 'A haunted marsh where lanterns never go out.')
  await cdp.evaluate(
    `(() => {
      const buttons = [...document.querySelectorAll('.campaign-start-modal button')]
      const create = buttons.find((b) => b.textContent?.includes('Create campaign'))
      create?.click()
      return !!create
    })()`
  )
  await cdp.waitFor(
    `(() => document.querySelector('.campaign-start-loading')?.textContent?.includes('Forging'))()`,
    30_000
  )
  const loadingLabels = []
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const label = await cdp.evaluate(
      `document.querySelector('.campaign-start-loading p')?.textContent ?? ''`
    )
    if (label && !loadingLabels.includes(label)) {
      loadingLabels.push(label)
    }
    const review = await cdp.evaluate(`!!document.querySelector('.campaign-review')`)
    if (review) {
      return { loadingLabels, review: true }
    }
    const modalOpen = await cdp.evaluate(`!!document.querySelector('.campaign-start-modal')`)
    const errorTitle = await cdp.evaluate(
      `document.querySelector('#campaign-start-title')?.textContent ?? ''`
    )
    if (modalOpen && errorTitle.includes('failed')) {
      return { loadingLabels, review: false, errorTitle }
    }
    await sleep(500)
  }
  throw new Error('Campaign create flow timed out')
}

async function smokeDevHappy() {
  const stub = createPlayer2Stub(200)
  await stub.listen()
  const port = 9343
  const child = spawnElectron(port, stubPlayer2Env())
  try {
    await withCdp(child, port, async (cdp) => {
      await waitForAppShell(cdp)
      const result = await runCampaignCreateFlow(cdp)
      record(
        'dev happy path',
        result.review,
        `loading=${result.loadingLabels.join(' → ')}`
      )
    })
  } finally {
    await stub.close()
    await killProcess(child)
    await sleep(2000)
  }
}

async function smokeDevFailureRetry() {
  const stub = createPlayer2Stub(500)
  await stub.listen()
  const port = 9344
  const child = spawnElectron(port, stubPlayer2Env())
  try {
    await withCdp(child, port, async (cdp) => {
      await waitForAppShell(cdp)
      await cdp.evaluate(`document.querySelector('.sidebar-new-campaign-button')?.click()`)
      await cdp.waitFor(`(() => !!document.querySelector('.campaign-start-modal'))()`)
      await setReactTextareaValue(
        cdp,
        '.campaign-start-modal textarea',
        'A doomed expedition into frozen ruins.'
      )
      await cdp.evaluate(
        `(() => {
          const create = [...document.querySelectorAll('.campaign-start-modal button')].find((b) =>
            b.textContent?.includes('Create campaign')
          )
          create?.click()
          return true
        })()`
      )
      await cdp.waitFor(
        `(() => document.querySelector('#campaign-start-title')?.textContent?.includes('failed'))()`,
        60_000
      )
      const errorText = await cdp.evaluate(
        `document.querySelector('.campaign-start-flow-error')?.textContent ?? ''`
      )
      stub.setChatStatus(200)
      await cdp.evaluate(
        `(() => {
          const retry = [...document.querySelectorAll('.campaign-start-modal button')].find((b) =>
            b.textContent?.includes('Retry')
          )
          retry?.click()
          return true
        })()`
      )
      await cdp.waitFor(`(() => !!document.querySelector('.campaign-review'))()`, 120_000)
      const recovered = await cdp.evaluate(`!!document.querySelector('.campaign-review')`)
      record('dev failure + retry', recovered, `error="${errorText}"`)
    })
  } finally {
    await stub.close()
    await killProcess(child)
    await sleep(2000)
  }
}

async function ensurePackagedExe() {
  const releaseDir = join(ROOT, 'release')
  const unpacked = join(releaseDir, 'win-unpacked', APP_EXE_NAME)
  if (existsSync(unpacked)) {
    return unpacked
  }
  const portable = readdirSync(releaseDir)
    .filter((name) => name.endsWith('.exe') && !name.includes('unpacked'))
    .map((name) => join(releaseDir, name))[0]
  if (portable && existsSync(portable)) {
    return portable
  }
  if (SKIP_PACKAGE) {
    throw new Error('Packaged exe missing (pass --skip-package to skip)')
  }
  log('Running npm run package (may take several minutes)...')
  await new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'package'], { cwd: ROOT, stdio: 'inherit', shell: true })
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`package failed: ${code}`))))
  })
  if (!portable || !existsSync(portable)) {
    throw new Error(`No portable .exe found in ${releaseDir}`)
  }
  return portable
}

async function smokePackagedHappy() {
  const stub = createPlayer2Stub(200)
  await stub.listen()
  const exe = await ensurePackagedExe()
  const releaseDir = dirname(exe)
  const envPath = join(releaseDir, '.env')
  if (!existsSync(envPath)) {
    copyFileSync(join(ROOT, '.env'), envPath)
  }
  const port = 9345
  const child = spawnPackagedExe(exe, port, stubPlayer2Env())
  try {
    await withCdp(child, port, async (cdp) => {
      await waitForAppShell(cdp)
      const result = await runCampaignCreateFlow(cdp)
      record('packaged happy path', result.review, `loading=${result.loadingLabels.join(' → ')}`)
    })
  } finally {
    await stub.close()
    await killProcess(child)
  }
}

async function main() {
  log(`Using Player2 stub at :${STUB_PORT}`)
  if (!PACKAGED_ONLY) {
    await ensureBuilt()
  } else {
    await ensureBuilt()
  }
  if (!PACKAGED_ONLY) {
    await smokeDevHappy()
    await smokeDevFailureRetry()
  }
  if (SKIP_PACKAGE) {
    log('Skipping packaged smoke (--skip-package)')
  } else {
    await smokePackagedHappy()
  }

  console.log('\n--- Campaign-start smoke summary ---')
  for (const r of results) {
    console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.notes ? `: ${r.notes}` : ''}`)
  }
  const failed = results.filter((r) => !r.pass)
  if (failed.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('[campaign-start-smoke] Fatal:', error.message)
  process.exit(1)
})
