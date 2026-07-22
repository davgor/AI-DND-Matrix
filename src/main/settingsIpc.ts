import { ipcMain } from 'electron'
import { existsSync } from 'node:fs'
import { testGeminiConnection } from '../agents/providers/gemini'
import { testGrokConnection } from '../agents/providers/grok'
import { testOpenAiConnection } from '../agents/providers/openai'
import { createClaudeProvider } from '../agents/providers/claude'
import { createPlayer2Provider } from '../agents/providers/player2'
import { isTruncationError } from '../agents/providers/tokenEscalation'
import { DEFAULT_PROVIDER_SETTINGS, type ConnectionCheckResult } from '../shared/settings/types'
import type { ProviderMode, ProviderSettings, RedactedProviderSettings, SaveProviderSettingsInput } from '../shared/settings/types'
import { redactProviderSettings, validateProviderSettings } from '../shared/settings/validation'
import { createElectronSecretCodec, getSettingsFilePath, loadSettings, saveSettings, type SecretCodec } from './settingsStore'

export class SettingsValidationFailedError extends Error {
  constructor(readonly errors: { field: string; message: string }[]) {
    super('Provider settings failed validation')
  }
}

export function getRedactedSettings(
  filePath: string,
  codec: SecretCodec,
  fallback: ProviderSettings
): RedactedProviderSettings {
  return redactProviderSettings(loadSettings(filePath, codec, fallback))
}

function mergeApiKey(
  incoming: string | undefined,
  current: string
): string {
  return incoming === undefined ? current : incoming
}

function mergeSaveInput(current: ProviderSettings, input: SaveProviderSettingsInput): ProviderSettings {
  return {
    ...current,
    ...input,
    claudeApiKey: mergeApiKey(input.claudeApiKey, current.claudeApiKey),
    openaiApiKey: mergeApiKey(input.openaiApiKey, current.openaiApiKey),
    geminiApiKey: mergeApiKey(input.geminiApiKey, current.geminiApiKey),
    grokApiKey: mergeApiKey(input.grokApiKey, current.grokApiKey)
  }
}

export function saveProviderSettings(
  filePath: string,
  codec: SecretCodec,
  fallback: ProviderSettings,
  input: SaveProviderSettingsInput
): RedactedProviderSettings {
  const current = loadSettings(filePath, codec, fallback)
  const merged = mergeSaveInput(current, input)

  const errors = validateProviderSettings(merged, {
    claudeApiKeySet: merged.claudeApiKey.trim().length > 0,
    openaiApiKeySet: merged.openaiApiKey.trim().length > 0,
    geminiApiKeySet: merged.geminiApiKey.trim().length > 0,
    grokApiKeySet: merged.grokApiKey.trim().length > 0
  })
  if (errors.length > 0) {
    throw new SettingsValidationFailedError(errors)
  }

  saveSettings(filePath, codec, merged)
  return redactProviderSettings(merged)
}

export async function testPlayer2Connection(baseUrl: string): Promise<ConnectionCheckResult> {
  try {
    const provider = createPlayer2Provider({ baseUrl })
    await provider.generate('ping', { maxTokens: 1, purpose: 'system.ping' })
    return { ok: true, message: 'Connected to Player2 successfully.' }
  } catch (error) {
    // 040.14: a 1-token ping usually stops at the cap — truncation proves the
    // endpoint responded, so it counts as connected rather than unreachable.
    if (isTruncationError(error)) {
      return { ok: true, message: 'Connected to Player2 successfully.' }
    }
    return { ok: false, message: `Could not reach Player2: ${(error as Error).message}` }
  }
}

interface CloudConnectionTestInput {
  mode: Extract<ProviderMode, 'claude' | 'openai' | 'gemini' | 'grok'>
  apiKey: string
  model: string
}

async function testClaudeConnection(apiKey: string, model: string): Promise<ConnectionCheckResult> {
  try {
    const provider = createClaudeProvider({ apiKey, model })
    await provider.generate('ping', { maxTokens: 1, purpose: 'system.ping' })
    return { ok: true, message: 'Connected to Claude successfully.' }
  } catch (error) {
    if (isTruncationError(error)) {
      return { ok: true, message: 'Connected to Claude successfully.' }
    }
    return { ok: false, message: `Could not reach Claude: ${(error as Error).message}` }
  }
}

function resolveCloudKey(
  filePath: string,
  codec: SecretCodec,
  mode: CloudConnectionTestInput['mode'],
  draftKey: string
): string {
  if (draftKey.trim()) {
    return draftKey.trim()
  }
  const saved = loadSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
  if (mode === 'claude') return saved.claudeApiKey
  if (mode === 'openai') return saved.openaiApiKey
  if (mode === 'gemini') return saved.geminiApiKey
  return saved.grokApiKey
}

async function testCloudProviderConnection(
  input: CloudConnectionTestInput,
  filePath: string,
  codec: SecretCodec
): Promise<ConnectionCheckResult> {
  const apiKey = resolveCloudKey(filePath, codec, input.mode, input.apiKey)
  if (!apiKey) {
    return { ok: false, message: 'API key is required to test the connection.' }
  }
  if (input.mode === 'claude') {
    return testClaudeConnection(apiKey, input.model)
  }
  if (input.mode === 'openai') {
    return testOpenAiConnection(apiKey, input.model)
  }
  if (input.mode === 'gemini') {
    return testGeminiConnection(apiKey, input.model)
  }
  return testGrokConnection(apiKey, input.model)
}

interface LlamaRuntimeCheckDeps {
  fetchHealth?: (url: string) => Promise<number>
  pathExists?: (path: string) => boolean
}

async function checkAttachMode(settings: ProviderSettings, deps: LlamaRuntimeCheckDeps): Promise<ConnectionCheckResult> {
  const fetchHealth = deps.fetchHealth ?? (async (url) => (await fetch(`${url}/health`)).status)
  const status = await fetchHealth(settings.llamaCppBaseUrl).catch(() => 0)
  if (status === 200) {
    return { ok: true, message: 'Local llama.cpp runtime is reachable and healthy.' }
  }
  return { ok: false, message: 'Could not reach the local llama.cpp runtime. Is llama-server running?' }
}

function checkManagedMode(settings: ProviderSettings, deps: LlamaRuntimeCheckDeps): ConnectionCheckResult {
  const pathExists = deps.pathExists ?? existsSync
  const missing: string[] = []
  if (settings.llamaCppServerPath.trim() && !pathExists(settings.llamaCppServerPath)) {
    missing.push('llama-server executable')
  }
  if (settings.llamaCppModelPath.trim() && !pathExists(settings.llamaCppModelPath)) {
    missing.push('model file')
  }
  if (missing.length > 0) {
    return { ok: false, message: `${missing.join(' and ')} not found at the configured path.` }
  }
  if (!settings.llamaCppServerPath.trim() && !settings.llamaCppModelPath.trim()) {
    return {
      ok: false,
      message: 'Download a catalog model and acquire a runtime (or set advanced paths) before checking.'
    }
  }
  return { ok: true, message: 'Runtime executable and model file were both found.' }
}

export async function checkLlamaRuntimeConfig(
  settings: ProviderSettings,
  deps: LlamaRuntimeCheckDeps = {}
): Promise<ConnectionCheckResult> {
  if (settings.llamaCppStartMode === 'managed') {
    return checkManagedMode(settings, deps)
  }
  return checkAttachMode(settings, deps)
}

export function registerSettingsHandlers(): void {
  const filePath = getSettingsFilePath()
  const codec = createElectronSecretCodec()

  ipcMain.handle('settings:get', () => getRedactedSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS))

  ipcMain.handle('settings:save', (_event, input: SaveProviderSettingsInput) =>
    saveProviderSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS, input)
  )

  ipcMain.handle('settings:testPlayer2Connection', (_event, baseUrl: string) => testPlayer2Connection(baseUrl))

  ipcMain.handle('settings:testCloudConnection', (_event, input: CloudConnectionTestInput) =>
    testCloudProviderConnection(input, filePath, codec)
  )

  ipcMain.handle('settings:checkLlamaRuntime', (_event, settings: ProviderSettings) =>
    checkLlamaRuntimeConfig(settings)
  )
}
