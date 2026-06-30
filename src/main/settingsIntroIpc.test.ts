import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissSettingsIntro,
  getSettingsIntroState,
  isDevForceShowPopup
} from './settingsIntroIpc'
import { markSettingsIntroDismissed } from './settingsIntroStore'

vi.mock('electron', () => ({
  app: { isPackaged: false },
  ipcMain: { handle: vi.fn() },
  shell: { openExternal: vi.fn() }
}))

let dir: string
let filePath: string
const originalShowPopup = process.env['SHOW_POPUP']

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'settings-intro-ipc-test-'))
  filePath = join(dir, 'settings-intro.json')
  delete process.env['SHOW_POPUP']
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  if (originalShowPopup === undefined) {
    delete process.env['SHOW_POPUP']
  } else {
    process.env['SHOW_POPUP'] = originalShowPopup
  }
})

describe('getSettingsIntroState', () => {
  it('shows on first launch when not forced by dev env', () => {
    expect(getSettingsIntroState(filePath)).toEqual({ shouldShow: true, devForceShow: false })
  })

  it('hides after dismissal when SHOW_POPUP is not forcing display', () => {
    markSettingsIntroDismissed(filePath)
    expect(getSettingsIntroState(filePath)).toEqual({ shouldShow: false, devForceShow: false })
  })

  it('always shows when SHOW_POPUP=true in dev', () => {
    process.env['SHOW_POPUP'] = 'true'
    markSettingsIntroDismissed(filePath)
    expect(getSettingsIntroState(filePath)).toEqual({ shouldShow: true, devForceShow: true })
  })
})

describe('dismissSettingsIntro', () => {
  it('persists dismissal unless dev force show is enabled', () => {
    dismissSettingsIntro(filePath)
    expect(readFileSync(filePath, 'utf-8')).toContain('"dismissed": true')
    expect(getSettingsIntroState(filePath).shouldShow).toBe(false)
  })

  it('does not persist dismissal when SHOW_POPUP=true', () => {
    process.env['SHOW_POPUP'] = 'true'
    dismissSettingsIntro(filePath)
    expect(getSettingsIntroState(filePath).shouldShow).toBe(true)
  })
})

describe('isDevForceShowPopup', () => {
  it('is true only when SHOW_POPUP=true in dev', () => {
    process.env['SHOW_POPUP'] = 'true'
    expect(isDevForceShowPopup()).toBe(true)
    process.env['SHOW_POPUP'] = 'false'
    expect(isDevForceShowPopup()).toBe(false)
  })
})
