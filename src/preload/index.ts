import { contextBridge, ipcRenderer } from 'electron'

const windowControls = {
  minimize: (): void => ipcRenderer.send('window:minimize'),
  maximize: (): void => ipcRenderer.send('window:maximize'),
  close: (): void => ipcRenderer.send('window:close')
}

contextBridge.exposeInMainWorld('windowControls', windowControls)

export type WindowControls = typeof windowControls
