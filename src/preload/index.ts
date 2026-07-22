import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { CreateCampaignResult } from '../main/campaignCreateIpc'
import type { DeleteCampaignResult } from '../shared/campaignDelete/types'
import type {
  CampaignDuplicateResult,
  CampaignExportResult,
  CampaignImportResult
} from '../shared/campaignPortability'
import type {
  EditNpcDispositionInput,
  EditNpcTraitsInput,
  EditRegionDescriptionInput,
  DeleteRegionInput,
  DeleteNpcInput,
  EditWorldHistoryInput,
  EditWorldSummaryInput,
  EditPantheonSummaryInput,
  EditFactionsSummaryInput,
  EditGenerativeTokensInput,
  EditNpcFaceTokenGenerationInput,
  EditEnemyTokenGenerationInput,
  GenerateRegionInput,
  GenerateNpcInput
} from '../main/campaignEditIpc'
import type { PlayAwareHubSnapshot } from '../shared/campaignHub/types'
import type { SessionRecapResult } from '../shared/sessionRecap'
import type { CampaignDetail } from '../main/campaignIpc'
import type { CreateCampaignRequest, CreateCampaignProgress } from '../shared/campaignCreate/types'
import type {
  CreatePartyMembersInput,
  CreatePlayerCharacterInput,
  ReplaceSetupPartyMembersInput,
  UpdatePlayerCharacterSetupInput
} from '../main/characterCreationIpc'
import type {
  GeneratePlayerCharacterIconInput,
  GeneratePlayerCharacterIconResult,
  ReplacePlayerCharacterPortraitInput
} from '../main/playerCharacterIconIpc'
import type { Character } from '../db/repositories/characters'
import type { CampaignWithLastPlayed } from '../db/repositories/campaigns'
import type { CombatStateSnapshot } from '../shared/combat/types'
import type { TurnInput } from '../main/turnIpc'
import type { TurnResolveResult } from '../shared/playResilience/types'
import type { GenerateObituaryInput, GenerateObituaryResult } from '../main/obituaryIpc'
import type { CharacterQuestView, CreateQuestInput, QuestIpcError, QuestStatus, UpdateQuestInput } from '../shared/quests/types'
import type { LogEntry, UpdateLogEntryInput } from '../shared/logBook/types'
import type { LogCategory } from '../shared/logBook/types'
import type {
  CharacterJournalEntry,
  JournalKnownDossier,
  PersonMatchCandidate
} from '../shared/journal/types'
import type { CharacterItemView } from '../shared/items/types'
import type { EquipSlot } from '../shared/items/types'
import type { PlayLogEntry } from '../main/narrationLog'
import type { PromoteNpcInput } from '../main/promotionIpc'
import type { StartupEventPayload } from '../shared/startup/types'
import type {
  GuidedCreationKickoffInput,
  GuidedCreationKickoffResult,
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
import type { SettingsIntroState } from '../shared/settingsIntro/types'
import type { AutoUpdateState, ManualUpdateCheckResult } from '../shared/autoUpdate/types'
import type { CampaignRace, RaceApplyInput, RaceApplyResult, RacePreviewLoreResult } from '../shared/raceSelection/types'
import type { RaceRosterGroup, PreviewLoreInput } from '../main/raceIpc'
import type {
  BackgroundApplyInput,
  BackgroundApplyResult,
  BackgroundGenerateStoryInput,
  BackgroundRosterEntry
} from '../shared/characterBackground/types'
import type { NpcDossierDto, NpcDossierOpinion } from '../shared/npcDossier/types'
import type {
  OpinionSubject,
  OpinionSubjectOption,
  RelationshipWebDto
} from '../shared/npcRelationships/types'
import type {
  AskDmListHistoryInput,
  AskDmMessage,
  AskDmSendMessageInput,
  AskDmSendMessageResult
} from '../shared/askDm/types'
import type { LlmUsageExportResult, LlmUsageRecentTotals } from '../shared/llmUsage'

const windowControls = {
  minimize: (): void => ipcRenderer.send('window:minimize'),
  maximize: (): void => ipcRenderer.send('window:maximize'),
  close: (): void => ipcRenderer.send('window:close')
}

const campaigns = {
  list: (): Promise<CampaignWithLastPlayed[]> => ipcRenderer.invoke('campaigns:list'),
  select: (campaignId: string): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:select', campaignId),
  getHubSnapshot: (campaignId: string): Promise<PlayAwareHubSnapshot> =>
    ipcRenderer.invoke('campaigns:getHubSnapshot', campaignId),
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
  deleteRegion: (input: DeleteRegionInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:deleteRegion', input),
  editWorldSummary: (input: EditWorldSummaryInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editWorldSummary', input),
  editPantheonSummary: (input: EditPantheonSummaryInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editPantheonSummary', input),
  editFactionsSummary: (input: EditFactionsSummaryInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editFactionsSummary', input),
  editGenerativeTokens: (input: EditGenerativeTokensInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editGenerativeTokens', input),
  editNpcFaceTokenGeneration: (input: EditNpcFaceTokenGenerationInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editNpcFaceTokenGeneration', input),
  editEnemyTokenGeneration: (input: EditEnemyTokenGenerationInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editEnemyTokenGeneration', input),
  editWorldHistory: (input: EditWorldHistoryInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editWorldHistory', input),
  editNpcDisposition: (input: EditNpcDispositionInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editNpcDisposition', input),
  editNpcTraits: (input: EditNpcTraitsInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:editNpcTraits', input),
  deleteNpc: (input: DeleteNpcInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:deleteNpc', input),
  generateRegion: (
    input: GenerateRegionInput
  ): Promise<{ ok: true; detail: CampaignDetail } | { ok: false; message: string }> =>
    ipcRenderer.invoke('campaigns:generateRegion', input),
  generateNpc: (
    input: GenerateNpcInput
  ): Promise<{ ok: true; detail: CampaignDetail } | { ok: false; message: string }> =>
    ipcRenderer.invoke('campaigns:generateNpc', input),
  generateRecap: (campaignId: string): Promise<string> =>
    ipcRenderer.invoke('campaigns:generateRecap', campaignId),
  getOrGenerateSessionRecap: (campaignId: string): Promise<SessionRecapResult> =>
    ipcRenderer.invoke('campaigns:getOrGenerateSessionRecap', campaignId),
  getNarrationLog: (campaignId: string, characterId?: string): Promise<PlayLogEntry[]> =>
    ipcRenderer.invoke('campaigns:getNarrationLog', campaignId, characterId),
  confirmPromotion: (input: PromoteNpcInput): Promise<CampaignDetail> =>
    ipcRenderer.invoke('campaigns:confirmPromotion', input),
  delete: (campaignId: string): Promise<DeleteCampaignResult> =>
    ipcRenderer.invoke('campaigns:delete', campaignId),
  export: (campaignId: string): Promise<CampaignExportResult> =>
    ipcRenderer.invoke('campaigns:export', campaignId),
  import: (): Promise<CampaignImportResult> => ipcRenderer.invoke('campaigns:import'),
  duplicate: (campaignId: string): Promise<CampaignDuplicateResult> =>
    ipcRenderer.invoke('campaigns:duplicate', campaignId)
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
  updatePlayerSetup: (input: UpdatePlayerCharacterSetupInput): Promise<Character> =>
    ipcRenderer.invoke('characters:updatePlayerSetup', input),
  replaceSetupPartyMembers: (input: ReplaceSetupPartyMembersInput): Promise<Character[]> =>
    ipcRenderer.invoke('characters:replaceSetupPartyMembers', input),
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
  dropItem: (input: {
    characterId: string
    characterItemId: string
    quantity?: number
  }): Promise<{ ok: boolean }> => ipcRenderer.invoke('characters:dropItem', input),
  validEquipSlots: (characterItemId: string, characterId: string): Promise<EquipSlot[]> =>
    ipcRenderer.invoke('characters:validEquipSlots', characterItemId, characterId),
  listLogEntries: (characterId: string): Promise<LogEntry[]> =>
    ipcRenderer.invoke('characters:listLogEntries', characterId),
  listJournalEntries: (characterId: string): Promise<CharacterJournalEntry[]> =>
    ipcRenderer.invoke('characters:listJournalEntries', characterId),
  generatePlayerIcon: (
    input: GeneratePlayerCharacterIconInput
  ): Promise<GeneratePlayerCharacterIconResult> =>
    ipcRenderer.invoke('characters:generatePlayerIcon', input),
  replacePlayerPortrait: (input: ReplacePlayerCharacterPortraitInput): Promise<Character | undefined> =>
    ipcRenderer.invoke('characters:replacePlayerPortrait', input)
}

const logBook = {
  createEntry: (input: {
    campaignId: string
    characterId: string
    category: LogCategory
    title: string
    content: string
    relatedEntityId?: string | null
  }): Promise<LogEntry | null> => ipcRenderer.invoke('logBook:createEntry', input),
  updateEntry: (input: {
    characterId: string
    entryId: string
    updates: UpdateLogEntryInput
  }): Promise<LogEntry | null> => ipcRenderer.invoke('logBook:updateEntry', input),
  deleteEntry: (input: { characterId: string; entryId: string }): Promise<boolean> =>
    ipcRenderer.invoke('logBook:deleteEntry', input)
}

const npcDossier = {
  get: (input: {
    campaignId: string
    characterId: string
    npcId: string
  }): Promise<NpcDossierDto | null> => ipcRenderer.invoke('npcDossier:get', input),
  getSubjectOpinion: (input: {
    campaignId: string
    characterId: string
    npcId: string
    subject: OpinionSubject
  }): Promise<NpcDossierOpinion | null> =>
    ipcRenderer.invoke('npcDossier:getSubjectOpinion', input),
  listOpinionSubjects: (input: {
    campaignId: string
    characterId: string
    npcId: string
  }): Promise<OpinionSubjectOption[]> =>
    ipcRenderer.invoke('npcDossier:listOpinionSubjects', input)
}

const relationshipWeb = {
  get: (input: {
    campaignId: string
    characterId: string
  }): Promise<RelationshipWebDto> => ipcRenderer.invoke('relationshipWeb:get', input)
}

const journal = {
  listKnownDossiers: (campaignId: string): Promise<JournalKnownDossier[]> =>
    ipcRenderer.invoke('journal:listKnownDossiers', campaignId),
  listPersonMatchCandidates: (input: {
    campaignId: string
    characterId: string
  }): Promise<PersonMatchCandidate[]> =>
    ipcRenderer.invoke('journal:listPersonMatchCandidates', input)
}

const askDm = {
  listHistory: (input: AskDmListHistoryInput): Promise<AskDmMessage[]> =>
    ipcRenderer.invoke('askDm:listHistory', input),
  sendMessage: (input: AskDmSendMessageInput): Promise<AskDmSendMessageResult> =>
    ipcRenderer.invoke('askDm:sendMessage', input)
}

const quests = {
  listForCharacter: (characterId: string): Promise<CharacterQuestView[]> =>
    ipcRenderer.invoke('quests:listForCharacter', characterId),
  accept: (input: { characterId: string; questId: string }): Promise<CharacterQuestView | QuestIpcError> =>
    ipcRenderer.invoke('quests:accept', input),
  abandon: (input: { characterId: string; questId: string }): Promise<CharacterQuestView | QuestIpcError> =>
    ipcRenderer.invoke('quests:abandon', input),
  updateNotes: (input: {
    characterId: string
    questId: string
    notes: string
  }): Promise<CharacterQuestView | QuestIpcError> =>
    ipcRenderer.invoke('quests:updateNotes', input),
  create: (
    input: CreateQuestInput & { characterId: string }
  ): Promise<CharacterQuestView | QuestIpcError> => ipcRenderer.invoke('quests:create', input),
  update: (input: {
    questId: string
    characterId: string
    updates: UpdateQuestInput
  }): Promise<CharacterQuestView | QuestIpcError> => ipcRenderer.invoke('quests:update', input),
  delete: (input: { questId: string; characterId: string }): Promise<{ ok: true } | QuestIpcError> =>
    ipcRenderer.invoke('quests:delete', input),
  forceStatus: (input: {
    characterId: string
    questId: string
    status: QuestStatus
  }): Promise<CharacterQuestView | QuestIpcError> =>
    ipcRenderer.invoke('quests:forceStatus', input),
  promoteWorldFact: (input: {
    characterId: string
    worldFactId: string
  }): Promise<CharacterQuestView | QuestIpcError> =>
    ipcRenderer.invoke('quests:promoteWorldFact', input)
}

const spellbook = {
  listForCharacter: (characterId: string): Promise<import('../shared/spells/types').KnownSpellView[]> =>
    ipcRenderer.invoke('spellbook:listForCharacter', characterId)
}

const turn = {
  resolve: (input: TurnInput): Promise<TurnResolveResult> => ipcRenderer.invoke('turn:resolve', input),
  generateObituary: (input: GenerateObituaryInput): Promise<GenerateObituaryResult> =>
    ipcRenderer.invoke('turn:generateObituary', input)
}

const combat = {
  getState: (campaignId: string): Promise<CombatStateSnapshot | null> =>
    ipcRenderer.invoke('combat:getState', campaignId)
}

const progression = {
  getPendingLevelUp: (characterId: string): Promise<import('../main/progressionIpc').PendingLevelUpResponse | null> =>
    ipcRenderer.invoke('progression:getPendingLevelUp', characterId),
  submitPerkChoice: (
    characterId: string,
    perkId: string
  ): Promise<{ applied: boolean; mechanicalSummary?: string; pending: boolean; character: Character | null }> =>
    ipcRenderer.invoke('progression:submitPerkChoice', characterId, perkId)
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

const startingLoadout = {
  getOffer: (input: { characterId: string }): Promise<
    | { ok: true; offer: import('../shared/startingLoadout/types').StartingLoadoutOffer }
    | {
        ok: false
        reason: string
        missingItems?: string[]
        missingSpells?: string[]
      }
  > => ipcRenderer.invoke('startingLoadout:getOffer', input),
  apply: (input: {
    characterId: string
    selections: {
      weaponName: string
      armorName: string
      offHandChoice: string
      spellKeys: string[]
    }
  }): Promise<import('../shared/startingLoadout/types').ApplyStartingLoadoutResult> =>
    ipcRenderer.invoke('startingLoadout:apply', input)
}

const race = {
  getRoster: (): Promise<RaceRosterGroup[]> => ipcRenderer.invoke('race:getRoster'),
  getCampaignRaces: (campaignId: string): Promise<CampaignRace[]> =>
    ipcRenderer.invoke('race:getCampaignRaces', campaignId),
  previewLore: (input: PreviewLoreInput): Promise<RacePreviewLoreResult> =>
    ipcRenderer.invoke('race:previewLore', input),
  apply: (input: RaceApplyInput): Promise<RaceApplyResult> => ipcRenderer.invoke('race:apply', input)
}

const background = {
  getRoster: (): Promise<BackgroundRosterEntry[]> => ipcRenderer.invoke('background:getRoster'),
  generateStory: (input: BackgroundGenerateStoryInput): Promise<string> =>
    ipcRenderer.invoke('background:generateStory', input),
  apply: (input: BackgroundApplyInput): Promise<BackgroundApplyResult> =>
    ipcRenderer.invoke('background:apply', input)
}

const guidedCreation = {
  getState: (characterId: string): Promise<GuidedCreationState | undefined> =>
    ipcRenderer.invoke('guidedCreation:getState', characterId),
  sendMessage: (input: GuidedCreationSendMessageInput): Promise<GuidedCreationSendMessageResult> =>
    ipcRenderer.invoke('guidedCreation:sendMessage', input),
  kickoffIdentity: (input: GuidedCreationKickoffInput): Promise<GuidedCreationKickoffResult> =>
    ipcRenderer.invoke('guidedCreation:kickoffIdentity', input),
  kickoffOpeningScene: (input: GuidedCreationKickoffInput): Promise<GuidedCreationKickoffResult> =>
    ipcRenderer.invoke('guidedCreation:kickoffOpeningScene', input),
  generateReply: (
    input: import('../shared/guidedCreation/types').GuidedCreationGenerateReplyInput
  ): Promise<import('../shared/guidedCreation/types').GuidedCreationGenerateReplyResult> =>
    ipcRenderer.invoke('guidedCreation:generateReply', input),
  revertPhase: (input: import('../shared/guidedCreation/types').GuidedCreationRevertPhaseInput): Promise<
    import('../shared/guidedCreation/types').GuidedCreationRevertPhaseResult
  > => ipcRenderer.invoke('guidedCreation:revertPhase', input)
}

const companions = {
  skip: (input: { characterId: string }): Promise<{ ok: true } | { ok: false; reason: string }> =>
    ipcRenderer.invoke('companions:skip', input),
  generate: (
    input: import('../main/companionsIpc').CompanionsGenerateInput
  ): Promise<import('../shared/partyMembers/types').CompanionPreviewDto> =>
    ipcRenderer.invoke('companions:generate', input),
  accept: (
    input: import('../main/companionsIpc').CompanionsAcceptInput
  ): Promise<import('../main/companionsIpc').CompanionsAcceptResult> =>
    ipcRenderer.invoke('companions:accept', input),
  setOrder: (
    input: import('../main/companionsIpc').CompanionsSetOrderInput
  ): Promise<import('../main/companionsIpc').CompanionsSetOrderResult> =>
    ipcRenderer.invoke('companions:setOrder', input),
  listRoster: (
    input: import('../main/companionsIpc').CompanionsListRosterInput
  ): Promise<import('../shared/partyMembers/types').CompanionRosterEntry[]> =>
    ipcRenderer.invoke('companions:listRoster', input)
}

const settings = {
  get: (): Promise<RedactedProviderSettings> => ipcRenderer.invoke('settings:get'),
  save: (input: SaveProviderSettingsInput): Promise<RedactedProviderSettings> =>
    ipcRenderer.invoke('settings:save', input),
  testPlayer2Connection: (baseUrl: string): Promise<ConnectionCheckResult> =>
    ipcRenderer.invoke('settings:testPlayer2Connection', baseUrl),
  testCloudConnection: (input: {
    mode: 'claude' | 'openai' | 'gemini' | 'grok'
    apiKey: string
    model: string
  }): Promise<ConnectionCheckResult> => ipcRenderer.invoke('settings:testCloudConnection', input),
  checkLlamaRuntime: (config: ProviderSettings): Promise<ConnectionCheckResult> =>
    ipcRenderer.invoke('settings:checkLlamaRuntime', config)
}

const llmUsage = {
  getRecentTotals: (): Promise<LlmUsageRecentTotals> => ipcRenderer.invoke('llmUsage:getRecentTotals'),
  exportLog: (campaignId?: string | null): Promise<LlmUsageExportResult> =>
    ipcRenderer.invoke('llmUsage:export', campaignId ?? null)
}

const settingsIntro = {
  getState: (): Promise<SettingsIntroState> => ipcRenderer.invoke('settingsIntro:getState'),
  dismiss: (): Promise<void> => ipcRenderer.invoke('settingsIntro:dismiss'),
  openPlayer2InstallPage: (): Promise<void> => ipcRenderer.invoke('settingsIntro:openPlayer2InstallPage')
}

const autoUpdate = {
  getState: (): Promise<AutoUpdateState> => ipcRenderer.invoke('autoUpdate:getState'),
  checkForUpdates: (): Promise<ManualUpdateCheckResult> =>
    ipcRenderer.invoke('autoUpdate:checkForUpdates'),
  quitAndInstall: (): Promise<void> => ipcRenderer.invoke('autoUpdate:quitAndInstall'),
  onEvent: (listener: (payload: AutoUpdateState) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: AutoUpdateState): void => {
      listener(payload)
    }
    ipcRenderer.on('autoUpdate:event', handler)
    return () => ipcRenderer.removeListener('autoUpdate:event', handler)
  }
}

contextBridge.exposeInMainWorld('windowControls', windowControls)
contextBridge.exposeInMainWorld('campaigns', campaigns)
contextBridge.exposeInMainWorld('files', files)
contextBridge.exposeInMainWorld('characters', characters)
contextBridge.exposeInMainWorld('logBook', logBook)
contextBridge.exposeInMainWorld('npcDossier', npcDossier)
contextBridge.exposeInMainWorld('relationshipWeb', relationshipWeb)
contextBridge.exposeInMainWorld('journal', journal)
contextBridge.exposeInMainWorld('askDm', askDm)
contextBridge.exposeInMainWorld('quests', quests)
contextBridge.exposeInMainWorld('spellbook', spellbook)
contextBridge.exposeInMainWorld('turn', turn)
contextBridge.exposeInMainWorld('combat', combat)
contextBridge.exposeInMainWorld('progression', progression)
contextBridge.exposeInMainWorld('startup', startup)
contextBridge.exposeInMainWorld('guidedCreation', guidedCreation)
contextBridge.exposeInMainWorld('companions', companions)
contextBridge.exposeInMainWorld('startingLoadout', startingLoadout)
contextBridge.exposeInMainWorld('race', race)
contextBridge.exposeInMainWorld('background', background)
contextBridge.exposeInMainWorld('settings', settings)
contextBridge.exposeInMainWorld('llmUsage', llmUsage)
contextBridge.exposeInMainWorld('settingsIntro', settingsIntro)
contextBridge.exposeInMainWorld('autoUpdate', autoUpdate)

export type WindowControls = typeof windowControls
export type CampaignsApi = typeof campaigns
export type FilesApi = typeof files
export type CharactersApi = typeof characters
export type LogBookApi = typeof logBook
export type NpcDossierApi = typeof npcDossier
export type RelationshipWebApi = typeof relationshipWeb
export type JournalApi = typeof journal
export type AskDmApi = typeof askDm
export type QuestsApi = typeof quests
export type SpellbookApi = typeof spellbook
export type TurnApi = typeof turn
export type CombatApi = typeof combat
export type ProgressionApi = typeof progression
export type StartupApi = typeof startup
export type GuidedCreationApi = typeof guidedCreation
export type CompanionsApi = typeof companions
export type StartingLoadoutApi = typeof startingLoadout
export type RaceApi = typeof race
export type BackgroundApi = typeof background
export type SettingsApi = typeof settings
export type LlmUsageApi = typeof llmUsage
export type SettingsIntroApi = typeof settingsIntro
export type AutoUpdateApi = typeof autoUpdate
