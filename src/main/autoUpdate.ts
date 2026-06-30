import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { AutoUpdateState } from '../shared/autoUpdate/types'
import { logger } from './logger'

const CHECK_DELAY_MS = 8_000

let state: AutoUpdateState = {
  phase: 'idle',
  currentVersion: app.getVersion()
}

function broadcastState(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('autoUpdate:event', state)
    }
  }
}

function setState(patch: Partial<AutoUpdateState>): void {
  state = { ...state, ...patch }
  broadcastState()
}

export function getAutoUpdateState(): AutoUpdateState {
  return state
}

export function isAutoUpdateEnabled(): boolean {
  return app.isPackaged && process.env['DISABLE_AUTO_UPDATE'] !== '1'
}

export function quitAndInstallUpdate(): void {
  autoUpdater.quitAndInstall(true, true)
}

export function registerAutoUpdateHandlers(): void {
  ipcMain.handle('autoUpdate:getState', () => getAutoUpdateState())
  ipcMain.handle('autoUpdate:quitAndInstall', () => {
    quitAndInstallUpdate()
  })
}

function wireAutoUpdaterEvents(): void {
  autoUpdater.on('checking-for-update', () => {
    setState({ phase: 'checking', message: undefined })
  })

  autoUpdater.on('update-available', (info) => {
    setState({
      phase: 'available',
      availableVersion: info.version,
      message: `Version ${info.version} is downloading…`
    })
  })

  autoUpdater.on('update-not-available', () => {
    setState({ phase: 'idle', availableVersion: undefined, downloadPercent: undefined })
  })

  autoUpdater.on('download-progress', (progress) => {
    setState({
      phase: 'downloading',
      downloadPercent: Math.round(progress.percent)
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    setState({
      phase: 'downloaded',
      availableVersion: info.version,
      downloadPercent: 100,
      message: `Version ${info.version} is ready. It will install when you quit, or restart now.`
    })
  })

  autoUpdater.on('error', (error) => {
    logger.error('Auto-update error:', error)
    setState({
      phase: 'error',
      message: error.message
    })
  })
}

function scheduleUpdateCheck(): void {
  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((error: unknown) => {
      logger.error('Auto-update check failed:', error)
      setState({
        phase: 'error',
        message: error instanceof Error ? error.message : 'Update check failed'
      })
    })
  }, CHECK_DELAY_MS)
}

export function initAutoUpdate(): void {
  if (!isAutoUpdateEnabled()) {
    logger.info('Auto-update disabled (dev build or DISABLE_AUTO_UPDATE=1)')
    return
  }

  autoUpdater.logger = logger
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  wireAutoUpdaterEvents()
  scheduleUpdateCheck()
}
