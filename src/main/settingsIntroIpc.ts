import { app, ipcMain, shell } from 'electron'
import { PLAYER2_INSTALL_URL } from '../shared/settingsIntro/types'
import { shouldShowSettingsIntro } from '../shared/settingsIntro/shouldShowSettingsIntro'
import type { SettingsIntroState } from '../shared/settingsIntro/types'
import {
  getSettingsIntroFilePath,
  isSettingsIntroDismissed,
  markSettingsIntroDismissed
} from './settingsIntroStore'

export function isDevForceShowPopup(): boolean {
  return !app.isPackaged && process.env['SHOW_POPUP'] === 'true'
}

export function getSettingsIntroState(filePath: string): SettingsIntroState {
  const devForceShow = isDevForceShowPopup()
  const dismissed = isSettingsIntroDismissed(filePath)
  return {
    devForceShow,
    shouldShow: shouldShowSettingsIntro(dismissed, devForceShow)
  }
}

export function dismissSettingsIntro(filePath: string): void {
  if (!isDevForceShowPopup()) {
    markSettingsIntroDismissed(filePath)
  }
}

export function registerSettingsIntroHandlers(): void {
  const filePath = getSettingsIntroFilePath()

  ipcMain.handle('settingsIntro:getState', () => getSettingsIntroState(filePath))

  ipcMain.handle('settingsIntro:dismiss', () => {
    dismissSettingsIntro(filePath)
  })

  ipcMain.handle('settingsIntro:openPlayer2InstallPage', () => {
    void shell.openExternal(PLAYER2_INSTALL_URL)
  })
}
