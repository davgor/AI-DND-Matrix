import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'node:path'
import { registerCampaignEditHandlers } from './campaignEditIpc'
import { registerCampaignDeleteHandlers } from './campaignDeleteIpc'
import { registerCampaignCreateHandlers } from './campaignCreateIpc'
import { registerCampaignHandlers } from './campaignIpc'
import { registerCharacterCreationHandlers } from './characterCreationIpc'
import { loadConfig } from './config'
import { registerFileUploadHandlers } from './fileUploadIpc'
import { setupGlobalErrorLogging } from './logger'
import { registerNarrationLogHandlers } from './narrationLog'
import { registerPromotionHandlers } from './promotionIpc'
import { registerRecapHandlers } from './recapIpc'
import { registerSettingsHandlers } from './settingsIpc'
import { registerStartupHandlers, runStartupBoot, shutdownStartupRuntime } from './startupIpc'
import { registerTurnHandlers } from './turnIpc'

Menu.setApplicationMenu(null)
loadConfig()
setupGlobalErrorLogging()

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return mainWindow
}

function registerWindowControlHandlers(): void {
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window?.isMaximized()) {
      window.unmaximize()
    } else {
      window?.maximize()
    }
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
}

app.whenReady().then(() => {
  registerWindowControlHandlers()
  registerCampaignHandlers()
  registerCampaignDeleteHandlers()
  registerCampaignEditHandlers()
  registerFileUploadHandlers()
  registerCharacterCreationHandlers()
  registerTurnHandlers()
  registerRecapHandlers()
  registerNarrationLogHandlers()
  registerPromotionHandlers()
  registerSettingsHandlers()
  const mainWindow = createMainWindow()
  registerStartupHandlers(mainWindow)
  registerCampaignCreateHandlers(mainWindow)
  mainWindow.webContents.once('did-finish-load', () => {
    void runStartupBoot()
  })
})

app.on('before-quit', () => {
  void shutdownStartupRuntime()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
