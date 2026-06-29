import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { CreateCampaignResult } from '../main/campaignCreateIpc'
import type { DeleteCampaignResult } from '../shared/campaignDelete/types'
import type {
  EditNpcDispositionInput,
  EditNpcTraitsInput,
  EditRegionDescriptionInput,
  GenerateRegionInput
} from '../main/campaignEditIpc'
import type { CampaignDetail } from '../main/campaignIpc'
import type { CreateCampaignRequest, CreateCampaignProgress } from '../shared/campaignCreate/types'
import type {
  CreatePartyMembersInput,
  CreatePlayerCharacterInput
} from '../main/characterCreationIpc'
import type { Character } from '../db/repositories/characters'
import type { CampaignWithLastPlayed } from '../db/repositories/campaigns'
import type { TurnInput, TurnResult } from '../main/turnIpc'
import type { LogEntry } from '../shared/logBook/types'
import type { CharacterJournalEntry } from '../shared/journal/types'
import type { CharacterItemView } from '../shared/items/types'
import type { EquipSlot } from '../shared/items/types'
import type { PlayLogEntry } from '../main/narrationLog'
import type { PromoteNpcInput } from '../main/promotionIpc'
import type { StartupEventPayload } from '../shared/startup/types'
import type {
  GuidedCreationSendMessageInput,
  GuidedCreationSendMessageResult,
  GuidedCreationState
} from '../shared/guidedCreation/types'
import type {
  ConnectionCheckResult,
  ProviderSettings,
  RedactedProviderSettings,
  SaveProviderSettingsInput
} from '../shared/settings/types'

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
  create: (request: CreateCampaignRequest): Promise<CreateCampaignResult> =>
    ipcRenderer.invoke('campaigns:create', request),
  onCreateProgress: (listener: (payload: CreateCampaignProgress) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: CreateCampaignProgress): void => {
      listener(payload)
    }
    ipcRenderer.on('campaignCreate:progress', handler)
    return () => ipcRenderer.removeListener('campaignCreate:progress', handler)
  },
  editRegionDescription: (input: EditRegionDescriptionInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editRegionDescription', input),
  editNpcDisposition: (input: EditNpcDispositionInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editNpcDisposition', input),
  editNpcTraits: (input: EditNpcTraitsInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editNpcTraits', input),
  generateRegion: (
    input: GenerateRegionInput
  ): Promise<{ ok: true; detail: CampaignDetail } | { ok: false; message: string }> =>
    ipcRenderer.invoke('campaigns:generateRegion', input),
  generateRecap: (campaignId: string): Promise<string> =>
    ipcRenderer.invoke('campaigns:generateRecap', campaignId),
  getNarrationLog: (campaignId: string): Promise<PlayLogEntry[]> =>
    ipcRenderer.invoke('campaigns:getNarrationLog', campaignId),
  confirmPromotion: (input: PromoteNpcInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:confirmPromotion', input),
  delete: (campaignId: string): Promise<DeleteCampaignResult> =>
    ipcRenderer.invoke('campaigns:delete', campaignId)
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
    ipcRenderer.invoke('characters:listByCampaign', campaignId),
  listItems: (characterId: string): Promise<CharacterItemView[]> =>
    ipcRenderer.invoke('characters:listItems', characterId),
  equipItem: (input: {
    characterId: string
    characterItemId: string
    slot: EquipSlot
  }): Promise<{ ok: true } | { ok: false; reason: string }> =>
    ipcRenderer.invoke('characters:equipItem', input),
  unequipItem: (input: { characterId: string; slot: EquipSlot }): Promise<void> =>
    ipcRenderer.invoke('characters:unequipItem', input),
  consumeItem: (input: { characterId: string; itemId: string }): Promise<
    { ok: true; hpAfter: number } | { ok: false; reason: string }
  > => ipcRenderer.invoke('characters:consumeItem', input),
  listLogEntries: (characterId: string): Promise<LogEntry[]> =>
    ipcRenderer.invoke('characters:listLogEntries', characterId),
  listJournalEntries: (characterId: string): Promise<CharacterJournalEntry[]> =>
    ipcRenderer.invoke('characters:listJournalEntries', characterId)
}

const turn = {
  resolve: (input: TurnInput): Promise<TurnResult> => ipcRenderer.invoke('turn:resolve', input)
}

const startup = {
  getState: (): Promise<StartupEventPayload> => ipcRenderer.invoke('startup:getState'),
  start: (): Promise<boolean> => ipcRenderer.invoke('startup:start'),
  retry: (): Promise<boolean> => ipcRenderer.invoke('startup:retry'),
  onEvent: (listener: (payload: StartupEventPayload) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: StartupEventPayload): void => {
      listener(payload)
    }
    ipcRenderer.on('startup:event', handler)
    return () => ipcRenderer.removeListener('startup:event', handler)
  }
}

const guidedCreation = {
  getState: (characterId: string): Promise<GuidedCreationState | undefined> =>
    ipcRenderer.invoke('guidedCreation:getState', characterId),
  sendMessage: (input: GuidedCreationSendMessageInput): Promise<GuidedCreationSendMessageResult> =>
    ipcRenderer.invoke('guidedCreation:sendMessage', input)
}

const settings = {
  get: (): Promise<RedactedProviderSettings> => ipcRenderer.invoke('settings:get'),
  save: (input: SaveProviderSettingsInput): Promise<RedactedProviderSettings> =>
    ipcRenderer.invoke('settings:save', input),
  testPlayer2Connection: (baseUrl: string): Promise<ConnectionCheckResult> =>
    ipcRenderer.invoke('settings:testPlayer2Connection', baseUrl),
  checkLlamaRuntime: (config: ProviderSettings): Promise<ConnectionCheckResult> =>
    ipcRenderer.invoke('settings:checkLlamaRuntime', config)
}

contextBridge.exposeInMainWorld('windowControls', windowControls)
contextBridge.exposeInMainWorld('campaigns', campaigns)
contextBridge.exposeInMainWorld('files', files)
contextBridge.exposeInMainWorld('characters', characters)
contextBridge.exposeInMainWorld('turn', turn)
contextBridge.exposeInMainWorld('startup', startup)
contextBridge.exposeInMainWorld('guidedCreation', guidedCreation)
contextBridge.exposeInMainWorld('settings', settings)

export type WindowControls = typeof windowControls
export type CampaignsApi = typeof campaigns
export type FilesApi = typeof files
export type CharactersApi = typeof characters
export type TurnApi = typeof turn
export type StartupApi = typeof startup
export type GuidedCreationApi = typeof guidedCreation
export type SettingsApi = typeof settings
