import { contextBridge, ipcRenderer } from 'electron'
import type {
  EditNpcDispositionInput,
  EditRegionDescriptionInput,
  SetDeathModeInput
} from '../main/campaignEditIpc'
import type { CampaignDetail } from '../main/campaignIpc'
import type {
  CreatePartyMembersInput,
  CreatePlayerCharacterInput
} from '../main/characterCreationIpc'
import type { Character } from '../db/repositories/characters'
import type { CampaignWithLastPlayed } from '../db/repositories/campaigns'
import type { TurnInput, TurnResult } from '../main/turnIpc'
import type { PlayLogEntry } from '../main/narrationLog'

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
    ipcRenderer.invoke('campaigns:generate', premisePrompt),
  setDeathMode: (input: SetDeathModeInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:setDeathMode', input),
  editRegionDescription: (input: EditRegionDescriptionInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editRegionDescription', input),
  editNpcDisposition: (input: EditNpcDispositionInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editNpcDisposition', input),
  generateRecap: (campaignId: string): Promise<string> =>
    ipcRenderer.invoke('campaigns:generateRecap', campaignId),
  getNarrationLog: (campaignId: string): Promise<PlayLogEntry[]> =>
    ipcRenderer.invoke('campaigns:getNarrationLog', campaignId)
}

const files = {
  selectPortrait: (): Promise<string | null> => ipcRenderer.invoke('files:selectPortrait'),
  selectSheetBackground: (): Promise<string | null> =>
    ipcRenderer.invoke('files:selectSheetBackground')
}

const characters = {
  createPlayer: (input: CreatePlayerCharacterInput): Promise<Character> =>
    ipcRenderer.invoke('characters:createPlayer', input),
  createPartyMembers: (input: CreatePartyMembersInput): Promise<Character[]> =>
    ipcRenderer.invoke('characters:createPartyMembers', input),
  listByCampaign: (campaignId: string): Promise<Character[]> =>
    ipcRenderer.invoke('characters:listByCampaign', campaignId)
}

const turn = {
  resolve: (input: TurnInput): Promise<TurnResult> => ipcRenderer.invoke('turn:resolve', input)
}

contextBridge.exposeInMainWorld('windowControls', windowControls)
contextBridge.exposeInMainWorld('campaigns', campaigns)
contextBridge.exposeInMainWorld('files', files)
contextBridge.exposeInMainWorld('characters', characters)
contextBridge.exposeInMainWorld('turn', turn)

export type WindowControls = typeof windowControls
export type CampaignsApi = typeof campaigns
export type FilesApi = typeof files
export type CharactersApi = typeof characters
export type TurnApi = typeof turn
