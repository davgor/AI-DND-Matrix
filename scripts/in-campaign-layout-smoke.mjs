#!/usr/bin/env node
/**
 * Epic 018.10 — in-campaign four-column layout smoke tests via Electron CDP.
 * Run: node scripts/in-campaign-layout-smoke.mjs [--skip-package]
 */
import 'dotenv/config'
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, readdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ELECTRON = join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe')
const SKIP_PACKAGE = process.argv.includes('--skip-package')
const PACKAGED_ONLY = process.argv.includes('--packaged-only')
const STUB_PORT = 54322

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
  console.log(`[in-campaign-smoke] ${msg}`)
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
  log('Building production bundle...')
  await new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true })
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build failed: ${code}`))))
  })
}

function stubPlayer2Env() {
  return {
    AGENT_PROVIDER: 'player2',
    PLAYER2_BASE_URL: `http://127.0.0.1:${STUB_PORT}`
  }
}

function createPlayer2Stub() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${STUB_PORT}`)
    if (req.method === 'GET' && url.pathname === '/v1/models') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ object: 'list', data: [{ id: 'stub', object: 'model' }] }))
      return
    }
    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      res.writeHead(200, { 'content-type': 'application/json' })
      const content = url.searchParams.get('kind') === 'turn' ? 'The lantern flickers.' : VALID_GENERATION
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }))
      return
    }
    res.writeHead(404)
    res.end()
  })
  return {
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

async function setReactInputValue(cdp, selector, value) {
  await cdp.evaluate(
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return false
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement
      const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value')?.set
      setter?.call(el, ${JSON.stringify(value)})
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })()`
  )
}

async function enterPlayMode(cdp) {
  await cdp.waitFor(`(() => !!document.querySelector('.sidebar, .in-campaign-layout'))()`, 90_000)
  if (await cdp.evaluate(`!!document.querySelector('.in-campaign-layout')`)) {
    return
  }
  const newBtn = await cdp.evaluate(
    `(() => {
      const btn = document.querySelector('.sidebar-new-campaign-button, .campaigns-rail-new-button')
      btn?.click()
      return !!btn
    })()`
  )
  if (!newBtn) {
    throw new Error('New campaign button not found')
  }
  await cdp.waitFor(`(() => !!document.querySelector('.campaign-start-modal'))()`)
  await setReactInputValue(cdp, '.campaign-start-modal textarea', 'A misty forest trail at dusk.')
  await cdp.evaluate(
    `(() => {
      const create = [...document.querySelectorAll('.campaign-start-modal button')].find((b) =>
        b.textContent?.includes('Create campaign')
      )
      create?.click()
      return true
    })()`
  )
  await cdp.waitFor(`(() => !!document.querySelector('.campaign-review'))()`, 120_000)
  await cdp.evaluate(`document.querySelector('.campaign-review-continue')?.click()`)
  await cdp.waitFor(`(() => !!document.querySelector('.character-setup'))()`)
  await setReactInputValue(cdp, '.character-setup input', 'Smoke Hero')
  await cdp.evaluate(
    `(() => {
      const archetype = document.querySelector('.character-setup label select, .character-setup select')
      if (!archetype) return false
      archetype.value = 'fighter'
      archetype.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })()`
  )
  await cdp.evaluate(
    `(() => {
      const method = document.querySelector('.ability-score-assignment select')
      if (!method) return false
      method.value = 'roll'
      method.dispatchEvent(new Event('change', { bubbles: true }))
      const roll = document.querySelector('.ability-score-assignment button')
      roll?.click()
      return true
    })()`
  )
  await cdp.evaluate(
    `(() => {
      const begin = [...document.querySelectorAll('.character-setup button')].find((b) =>
        b.textContent?.includes('Begin Adventure')
      )
      if (!begin || begin.disabled) return false
      begin.click()
      return true
    })()`
  )
  await cdp.waitFor(`(() => !!document.querySelector('.in-campaign-layout'))()`, 120_000)
}

async function verifyFourColumnLayout(cdp) {
  const columns = await cdp.evaluate(
    `({
      layout: !!document.querySelector('.in-campaign-layout'),
      campaigns: !!document.querySelector('.in-campaign-column--campaigns'),
      dm: !!document.querySelector('.in-campaign-column--dm'),
      player: !!document.querySelector('.in-campaign-column--player'),
      sheet: !!document.querySelector('.in-campaign-column--sheet')
    })`
  )
  return columns.layout && columns.campaigns && columns.dm && columns.player && columns.sheet
}

async function smokeLayoutAndRails(cdp) {
  await enterPlayMode(cdp)
  const fourColumn = await verifyFourColumnLayout(cdp)
  record('four-column layout regions', fourColumn)

  const chrome = await cdp.evaluate(
    `({
      chrome: !!document.querySelector('.play-session-chrome'),
      hubButton: !!document.querySelector('.play-session-chrome-hub-button'),
      character: !!document.querySelector('.play-session-chrome-character')
    })`
  )
  record('play session chrome', chrome.chrome && chrome.hubButton && chrome.character)

  await cdp.evaluate(`document.querySelector('.campaigns-rail-toggle')?.click()`)
  const campaignsCollapsed = await cdp.evaluate(
    `document.querySelector('.in-campaign-layout')?.classList.contains('in-campaign-layout--campaigns-collapsed')`
  )
  record('campaigns rail collapse', campaignsCollapsed)

  await cdp.evaluate(`document.querySelector('.player-sheet-rail-toggle')?.click()`)
  const sheetCollapsed = await cdp.evaluate(
    `document.querySelector('.in-campaign-layout')?.classList.contains('in-campaign-layout--sheet-collapsed')`
  )
  record('player sheet rail collapse', sheetCollapsed)

  const interaction = await cdp.evaluate(
    `({
      textarea: !!document.querySelector('.play-view-input-row textarea'),
      exposition: !!document.querySelector('.dm-exposition-panel'),
      playSheetTabs: !!document.querySelector('.play-sheet-tabs')
    })`
  )
  record('columns 2 and 3 interaction surfaces', interaction.textarea && interaction.exposition)

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1024,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  })
  await sleep(300)
  const compactLayout = await cdp.evaluate(
    `document.querySelector('.in-campaign-layout')?.classList.contains('in-campaign-layout--sheet-overlay') ||
      document.querySelector('.in-campaign-layout')?.classList.contains('in-campaign-layout--compact')`
  )
  record('compact width layout mode', compactLayout)
  await cdp.send('Emulation.clearDeviceMetricsOverride')
}

async function smokeDev() {
  const stub = createPlayer2Stub()
  await stub.listen()
  const port = 9350
  const child = spawnElectron(port, stubPlayer2Env())
  try {
    await withCdp(child, port, smokeLayoutAndRails)
  } finally {
    await stub.close()
    await killProcess(child)
    await sleep(2000)
  }
}

async function ensurePackagedExe() {
  const releaseDir = join(ROOT, 'release')
  const portable = readdirSync(releaseDir)
    .filter((name) => name.endsWith('.exe') && !name.includes('unpacked'))
    .map((name) => join(releaseDir, name))[0]
  if (portable && existsSync(portable)) {
    return portable
  }
  if (SKIP_PACKAGE) {
    throw new Error('Packaged exe missing')
  }
  log('Running npm run package...')
  await new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'package'], { cwd: ROOT, stdio: 'inherit', shell: true })
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`package failed: ${code}`))))
  })
  return portable
}

async function smokePackaged() {
  const stub = createPlayer2Stub()
  await stub.listen()
  const exe = await ensurePackagedExe()
  const envPath = join(dirname(exe), '.env')
  if (!existsSync(envPath)) {
    copyFileSync(join(ROOT, '.env'), envPath)
  }
  const port = 9351
  const child = spawnPackagedExe(exe, port, stubPlayer2Env())
  try {
    await withCdp(child, port, async (cdp) => {
      await enterPlayMode(cdp)
      record('packaged four-column layout', await verifyFourColumnLayout(cdp))
    })
  } finally {
    await stub.close()
    await killProcess(child)
  }
}

async function main() {
  if (!PACKAGED_ONLY) {
    await ensureBuilt()
    await smokeDev()
  }
  if (SKIP_PACKAGE) {
    log('Skipping packaged smoke (--skip-package)')
  } else {
    await smokePackaged()
  }

  console.log('\n--- In-campaign layout smoke summary ---')
  for (const r of results) {
    console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.notes ? `: ${r.notes}` : ''}`)
  }
  if (results.some((r) => !r.pass)) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('[in-campaign-smoke] Fatal:', error.message)
  process.exit(1)
})
