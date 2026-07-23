import { existsSync } from 'node:fs'
import type { ConnectionCheckResult, ProviderSettings } from '../../shared/settings/types'

const BODY_SNIPPET_MAX = 1500

export interface LlamaHealthProbe {
  status: number
  error?: string
}

export interface LlamaChatPingResult {
  ok: boolean
  status?: number
  latencyMs?: number
  preview?: string
  truncated?: boolean
  body?: string
  error?: string
}

export interface LlamaRuntimeCheckDeps {
  fetchHealth?: (baseUrl: string) => Promise<LlamaHealthProbe>
  pingChat?: (baseUrl: string) => Promise<LlamaChatPingResult>
  pathExists?: (path: string) => boolean
}

async function defaultFetchHealth(baseUrl: string): Promise<LlamaHealthProbe> {
  try {
    const response = await fetch(`${baseUrl}/health`)
    return { status: response.status }
  } catch (error) {
    return { status: 0, error: (error as Error).message }
  }
}

/**
 * Tiny chat-completions probe used by Settings → Check runtime.
 * Exported for unit tests that inject a fake fetch.
 */
export async function defaultLlamaChatPing(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<LlamaChatPingResult> {
  const started = Date.now()
  try {
    const response = await fetchImpl(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Reply with the single word pong.' }],
        max_tokens: 8
      })
    })
    const body = (await response.text()).slice(0, BODY_SNIPPET_MAX)
    const latencyMs = Date.now() - started
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        latencyMs,
        body,
        error: `HTTP ${response.status}`
      }
    }
    return parseSuccessfulPing(body, response.status, latencyMs)
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: (error as Error).message
    }
  }
}

function parseSuccessfulPing(
  body: string,
  status: number,
  latencyMs: number
): LlamaChatPingResult {
  try {
    const data = JSON.parse(body) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
    }
    const choice = data.choices?.[0]
    const preview = choice?.message?.content?.trim() ?? ''
    const truncated = choice?.finish_reason === 'length'
    if (!preview && !truncated) {
      return {
        ok: false,
        status,
        latencyMs,
        body,
        error: 'Chat response missing assistant content'
      }
    }
    return {
      ok: true,
      status,
      latencyMs,
      preview: preview.slice(0, 80),
      truncated
    }
  } catch {
    return {
      ok: false,
      status,
      latencyMs,
      body,
      error: 'Chat response was not valid JSON'
    }
  }
}

function formatPathLine(label: string, path: string, exists: boolean | null): string {
  if (!path.trim()) {
    return `${label}: (not set)`
  }
  if (exists == null) {
    return `${label}: ${path}`
  }
  return `${label}: ${path} (${exists ? 'exists' : 'MISSING'})`
}

function managedPathIssues(
  settings: ProviderSettings,
  pathExists: (path: string) => boolean
): { lines: string[]; blocking: boolean } {
  const serverPath = settings.llamaCppServerPath.trim()
  const modelPath = settings.llamaCppModelPath.trim()
  const serverExists = serverPath ? pathExists(serverPath) : null
  const modelExists = modelPath ? pathExists(modelPath) : null
  const lines = [
    formatPathLine('serverPath', serverPath, serverExists),
    formatPathLine('modelPath', modelPath, modelExists)
  ]
  if (!serverPath && !modelPath) {
    return {
      lines: [
        ...lines,
        'paths: Download a catalog model and acquire a runtime (or set advanced paths) before checking.'
      ],
      blocking: true
    }
  }
  const missing: string[] = []
  if (serverPath && serverExists === false) {
    missing.push('llama-server executable')
  }
  if (modelPath && modelExists === false) {
    missing.push('model file')
  }
  if (missing.length > 0) {
    return {
      lines: [...lines, `paths: ${missing.join(' and ')} not found at the configured path.`],
      blocking: true
    }
  }
  return { lines, blocking: false }
}

function formatHealthLine(health: LlamaHealthProbe): string {
  if (health.status === 200) {
    return 'health: HTTP 200 (ready)'
  }
  if (health.status === 0) {
    return `health: unreachable${health.error ? ` (${health.error})` : ''}`
  }
  return `health: HTTP ${health.status}${health.error ? ` (${health.error})` : ''}`
}

function formatPingLine(ping: LlamaChatPingResult): string {
  if (ping.ok) {
    const details = [
      `HTTP ${ping.status ?? 200}`,
      ping.latencyMs != null ? `${ping.latencyMs} ms` : null,
      ping.truncated ? 'truncated at max_tokens' : null,
      ping.preview ? `preview=${JSON.stringify(ping.preview)}` : null
    ].filter(Boolean)
    return `ping: ok (${details.join(', ')})`
  }
  const bits = [
    ping.error ?? 'failed',
    ping.status != null ? `HTTP ${ping.status}` : null,
    ping.latencyMs != null ? `${ping.latencyMs} ms` : null
  ].filter(Boolean)
  const lines = [`ping: ${bits.join(' · ')}`]
  if (ping.body) {
    lines.push(`body: ${ping.body}`)
  }
  return lines.join('\n')
}

function buildDiagnosticMessage(args: {
  ok: boolean
  settings: ProviderSettings
  pathLines: string[]
  health: LlamaHealthProbe
  ping: LlamaChatPingResult
  summary: string
}): string {
  const lines = [
    args.summary,
    `mode: ${args.settings.llamaCppStartMode}`,
    `baseUrl: ${args.settings.llamaCppBaseUrl}`,
    ...args.pathLines,
    formatHealthLine(args.health),
    formatPingLine(args.ping)
  ]
  return lines.join('\n')
}

function successResult(args: {
  settings: ProviderSettings
  pathLines: string[]
  health: LlamaHealthProbe
  ping: LlamaChatPingResult
}): ConnectionCheckResult {
  return {
    ok: true,
    message: buildDiagnosticMessage({
      ok: true,
      settings: args.settings,
      pathLines: args.pathLines,
      health: args.health,
      ping: args.ping,
      summary: 'Local llama.cpp runtime is healthy and responded to an LLM ping.'
    })
  }
}

function failureResult(args: {
  settings: ProviderSettings
  pathLines: string[]
  health: LlamaHealthProbe
  ping: LlamaChatPingResult
  summary: string
}): ConnectionCheckResult {
  return {
    ok: false,
    message: buildDiagnosticMessage({
      ok: false,
      settings: args.settings,
      pathLines: args.pathLines,
      health: args.health,
      ping: args.ping,
      summary: args.summary
    })
  }
}

/**
 * Settings → Check runtime for local llama.cpp: path diagnostics, /health, and a chat ping.
 */
export async function checkLlamaRuntimeConfig(
  settings: ProviderSettings,
  deps: LlamaRuntimeCheckDeps = {}
): Promise<ConnectionCheckResult> {
  const pathExists = deps.pathExists ?? existsSync
  const fetchHealth = deps.fetchHealth ?? defaultFetchHealth
  const pingChat = deps.pingChat ?? ((baseUrl: string) => defaultLlamaChatPing(baseUrl))

  const pathReport =
    settings.llamaCppStartMode === 'managed'
      ? managedPathIssues(settings, pathExists)
      : { lines: [] as string[], blocking: false }

  if (pathReport.blocking) {
    return failureResult({
      settings,
      pathLines: pathReport.lines,
      health: { status: 0, error: 'skipped (paths invalid)' },
      ping: { ok: false, error: 'skipped (paths invalid)' },
      summary: 'Local llama.cpp check failed — configured paths are invalid.'
    })
  }

  const health = await fetchHealth(settings.llamaCppBaseUrl)
  const ping =
    health.status === 200
      ? await pingChat(settings.llamaCppBaseUrl)
      : { ok: false as const, error: 'skipped (runtime not healthy)' }

  if (health.status === 200 && ping.ok) {
    return successResult({ settings, pathLines: pathReport.lines, health, ping })
  }

  return failureResult({
    settings,
    pathLines: pathReport.lines,
    health,
    ping,
    summary: 'Local llama.cpp check failed.'
  })
}
