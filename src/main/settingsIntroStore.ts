import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const DEV_DATA_DIR = join(process.cwd(), '.data')
const SETTINGS_INTRO_FILENAME = 'settings-intro.json'

interface PersistedSettingsIntro {
  dismissed: boolean
}

export function getSettingsIntroFilePath(): string {
  if (app.isPackaged) {
    return join(app.getPath('userData'), SETTINGS_INTRO_FILENAME)
  }
  return join(DEV_DATA_DIR, SETTINGS_INTRO_FILENAME)
}

export function isSettingsIntroDismissed(filePath: string): boolean {
  if (!existsSync(filePath)) {
    return false
  }
  const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as Partial<PersistedSettingsIntro>
  return parsed.dismissed === true
}

export function markSettingsIntroDismissed(filePath: string): void {
  const file: PersistedSettingsIntro = { dismissed: true }
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(file, null, 2), 'utf-8')
}
