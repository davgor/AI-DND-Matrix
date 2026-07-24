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

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'settings-intro-ipc-test-'))
  filePath = join(dir, 'settings-intro.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('getSettingsIntroState', () => {
  it('shows on first launch in unpackaged/dev', () => {
    expect(getSettingsIntroState(filePath, false)).toEqual({
      shouldShow: true,
      devForceShow: true
    })
  })

  it('always shows in unpackaged/dev even after dismissal', () => {
    markSettingsIntroDismissed(filePath)
    expect(getSettingsIntroState(filePath, false)).toEqual({
      shouldShow: true,
      devForceShow: true
    })
  })

  it('hides after dismissal when packaged', () => {
    markSettingsIntroDismissed(filePath)
    expect(getSettingsIntroState(filePath, true)).toEqual({
      shouldShow: false,
      devForceShow: false
    })
  })
})

describe('dismissSettingsIntro', () => {
  it('does not persist dismissal in unpackaged/dev builds', () => {
    dismissSettingsIntro(filePath, false)
    expect(getSettingsIntroState(filePath, false).shouldShow).toBe(true)
  })

  it('persists dismissal when packaged', () => {
    dismissSettingsIntro(filePath, true)
    expect(readFileSync(filePath, 'utf-8')).toContain('"dismissed": true')
    expect(getSettingsIntroState(filePath, true).shouldShow).toBe(false)
  })
})

describe('isDevForceShowPopup', () => {
  it('is true when unpackaged and false when packaged', () => {
    expect(isDevForceShowPopup(false)).toBe(true)
    expect(isDevForceShowPopup(true)).toBe(false)
  })
})
