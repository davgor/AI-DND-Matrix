import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'node:path'
import { resolveBrowserWindowIconPath } from './appIcon'
import { registerCampaignEditHandlers } from './campaignEditIpc'
import { registerCampaignDeleteHandlers } from './campaignDeleteIpc'
import { registerCampaignPortabilityHandlers } from './campaignPortabilityIpc'
import { registerCampaignCreateHandlers } from './campaignCreateIpc'
import { registerCampaignHandlers } from './campaignIpc'
import { registerCampaignHubHandlers } from './campaignHubIpc'
import { registerCharacterCreationHandlers } from './characterCreationIpc'
import { registerPlayerCharacterIconHandlers } from './playerCharacterIconIpc'
import { registerGuidedCreationHandlers } from './guidedCreationIpc'
import { registerItemHandlers } from './itemIpc'
import { registerJournalHandlers } from './journalIpc'
import { registerLogBookHandlers } from './logBookIpc'
import { loadConfig } from './config'
import { registerFileUploadHandlers } from './fileUploadIpc'
import { setupGlobalErrorLogging } from './logger'
import { registerNarrationLogHandlers } from './narrationLog'
import { registerPromotionHandlers } from './promotionIpc'
import { registerRecapHandlers } from './recapIpc'
import { registerLlmUsageHandlers } from './llmUsageIpc'
import { registerSettingsHandlers } from './settingsIpc'
import { registerLlamaCppAssetHandlers } from './llamacppAssetsIpc'
import { registerSettingsIntroHandlers } from './settingsIntroIpc'
import { registerStartupHandlers, runStartupBoot, shutdownStartupRuntime } from './startupIpc'
import { registerTurnHandlers } from './turnIpc'
import { registerCombatHandlers } from './combatIpc'
import { registerQuestHandlers } from './questIpc'
import { registerSpellbookHandlers } from './spellbookIpc'
import { registerStartingLoadoutHandlers } from './startingLoadoutIpc'
import { registerCompanionsHandlers } from './companionsIpc'
import { registerRaceHandlers } from './raceIpc'
import { registerBackgroundHandlers } from './backgroundIpc'
import { registerNpcDossierHandlers } from './npcDossierIpc'
import { registerAskDmHandlers } from './askDmIpc'
import { registerProgressionHandlers } from './progressionIpc'
import { initAutoUpdate, registerAutoUpdateHandlers } from './autoUpdate'
import { configureSpellcheck } from './spellcheck'

Menu.setApplicationMenu(null)
loadConfig()
setupGlobalErrorLogging()

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    icon: resolveBrowserWindowIconPath({
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath
    }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  })

  configureSpellcheck(mainWindow)

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
  registerCampaignHubHandlers()
  registerCampaignDeleteHandlers()
  registerCampaignPortabilityHandlers()
  registerCampaignEditHandlers()
  registerFileUploadHandlers()
  registerCharacterCreationHandlers()
  registerPlayerCharacterIconHandlers()
  registerItemHandlers()
  registerJournalHandlers()
  registerLogBookHandlers()
  registerQuestHandlers()
  registerSpellbookHandlers()
  registerStartingLoadoutHandlers()
  registerCompanionsHandlers()
  registerRaceHandlers()
  registerBackgroundHandlers()
  registerNpcDossierHandlers()
  registerAskDmHandlers()
  registerGuidedCreationHandlers()
  registerTurnHandlers()
  registerCombatHandlers()
  registerProgressionHandlers()
  registerRecapHandlers()
  registerNarrationLogHandlers()
  registerPromotionHandlers()
  registerSettingsHandlers()
  registerLlamaCppAssetHandlers()
  registerLlmUsageHandlers()
  registerSettingsIntroHandlers()
  registerAutoUpdateHandlers()
  initAutoUpdate()
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
