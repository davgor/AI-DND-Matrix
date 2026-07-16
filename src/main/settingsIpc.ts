import { ipcMain } from 'electron'
import { createPlayer2Provider } from '../agents/providers/player2'
import { isTruncationError } from '../agents/providers/tokenEscalation'
import { DEFAULT_PROVIDER_SETTINGS, type ConnectionCheckResult } from '../shared/settings/types'
import type { ProviderSettings, RedactedProviderSettings, SaveProviderSettingsInput } from '../shared/settings/types'
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

function mergeSaveInput(current: ProviderSettings, input: SaveProviderSettingsInput): ProviderSettings {
  return {
    ...current,
    ...input,
    claudeApiKey: input.claudeApiKey === undefined ? current.claudeApiKey : input.claudeApiKey
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

  const errors = validateProviderSettings(merged)
  if (errors.length > 0) {
    throw new SettingsValidationFailedError(errors)
  }

  saveSettings(filePath, codec, merged)
  return redactProviderSettings(merged)
}

export async function testPlayer2Connection(baseUrl: string): Promise<ConnectionCheckResult> {
  try {
    const provider = createPlayer2Provider({ baseUrl })
    await provider.generate('ping', { maxTokens: 1 })
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

export interface LlamaRuntimeCheckDeps {
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
  const pathExists = deps.pathExists ?? (() => false)
  const missing: string[] = []
  if (!pathExists(settings.llamaCppServerPath)) {
    missing.push('llama-server executable')
  }
  if (!pathExists(settings.llamaCppModelPath)) {
    missing.push('model file')
  }
  if (missing.length > 0) {
    return { ok: false, message: `${missing.join(' and ')} not found at the configured path.` }
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

  ipcMain.handle('settings:checkLlamaRuntime', (_event, settings: ProviderSettings) =>
    checkLlamaRuntimeConfig(settings)
  )
}
