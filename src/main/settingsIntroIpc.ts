import { app, ipcMain, shell } from 'electron'
import { PLAYER2_INSTALL_URL } from '../shared/settingsIntro/types'
import { shouldShowSettingsIntro } from '../shared/settingsIntro/shouldShowSettingsIntro'
import type { SettingsIntroState } from '../shared/settingsIntro/types'
import {
  getSettingsIntroFilePath,
  isSettingsIntroDismissed,
  markSettingsIntroDismissed
} from './settingsIntroStore'

export function isDevForceShowPopup(isPackaged: boolean = app.isPackaged): boolean {
  // Unpackaged/dev builds always treat the user as first-time for the intro flow.
  return !isPackaged
}

export function getSettingsIntroState(
  filePath: string,
  isPackaged: boolean = app.isPackaged
): SettingsIntroState {
  const devForceShow = isDevForceShowPopup(isPackaged)
  const dismissed = isSettingsIntroDismissed(filePath)
  return {
    devForceShow,
    shouldShow: shouldShowSettingsIntro(dismissed, devForceShow)
  }
}

export function dismissSettingsIntro(
  filePath: string,
  isPackaged: boolean = app.isPackaged
): void {
  if (!isDevForceShowPopup(isPackaged)) {
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
