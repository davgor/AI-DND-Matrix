import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ProviderSettings } from '../shared/settings/types'

const DEV_DATA_DIR = join(process.cwd(), '.data')
const SETTINGS_FILENAME = 'settings.json'

export interface SecretCodec {
  available: boolean
  encrypt(plain: string): string
  decrypt(encoded: string): string
}

export function createElectronSecretCodec(): SecretCodec {
  return {
    available: safeStorage.isEncryptionAvailable(),
    encrypt: (plain) => safeStorage.encryptString(plain).toString('base64'),
    decrypt: (encoded) => safeStorage.decryptString(Buffer.from(encoded, 'base64'))
  }
}

export function getSettingsFilePath(): string {
  if (app.isPackaged) {
    return join(app.getPath('userData'), SETTINGS_FILENAME)
  }
  return join(DEV_DATA_DIR, SETTINGS_FILENAME)
}

interface PersistedSettingsFile {
  claudeApiKeyEncrypted: string
  rest: Omit<ProviderSettings, 'claudeApiKey'>
}

export function loadSettings(
  filePath: string,
  codec: SecretCodec,
  fallback: ProviderSettings
): ProviderSettings {
  if (!existsSync(filePath)) {
    return fallback
  }
  const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as Partial<PersistedSettingsFile>
  const claudeApiKey = parsed.claudeApiKeyEncrypted ? codec.decrypt(parsed.claudeApiKeyEncrypted) : ''
  return { ...fallback, ...parsed.rest, claudeApiKey }
}

export function loadSettingsOrNull(filePath: string, codec: SecretCodec, fallback: ProviderSettings): ProviderSettings | null {
  if (!existsSync(filePath)) {
    return null
  }
  return loadSettings(filePath, codec, fallback)
}

export function saveSettings(filePath: string, codec: SecretCodec, settings: ProviderSettings): void {
  const { claudeApiKey, ...rest } = settings
  const file: PersistedSettingsFile = {
    claudeApiKeyEncrypted: claudeApiKey ? codec.encrypt(claudeApiKey) : '',
    rest
  }
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(file, null, 2), 'utf-8')
}
