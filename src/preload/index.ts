import { contextBridge, ipcRenderer } from 'electron'
import type { CampaignDetail } from '../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../db/repositories/campaigns'

const windowControls = {
  minimize: (): void => ipcRenderer.send('window:minimize'),
  maximize: (): void => ipcRenderer.send('window:maximize'),
  close: (): void => ipcRenderer.send('window:close')
}

const campaigns = {
  list: (): Promise<CampaignWithLastPlayed[]> => ipcRenderer.invoke('campaigns:list'),
  select: (campaignId: string): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:select', campaignId),
  generate: (premisePrompt: string): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:generate', premisePrompt)
}

contextBridge.exposeInMainWorld('windowControls', windowControls)
contextBridge.exposeInMainWorld('campaigns', campaigns)

export type WindowControls = typeof windowControls
export type CampaignsApi = typeof campaigns
