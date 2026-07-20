import type { AutoUpdateApi, BackgroundApi, CampaignsApi, CharactersApi, LogBookApi, CombatApi, FilesApi, GuidedCreationApi, NpcDossierApi, AskDmApi, LlmUsageApi, ProgressionApi, QuestsApi, RaceApi, SettingsApi, SettingsIntroApi, SpellbookApi, StartupApi, StartingLoadoutApi, TurnApi, WindowControls } from '../../preload'

declare global {
  interface Window {
    windowControls: WindowControls
    campaigns: CampaignsApi
    files: FilesApi
    characters: CharactersApi
    logBook: LogBookApi
    guidedCreation: GuidedCreationApi
    turn: TurnApi
    combat: CombatApi
    progression: ProgressionApi
    startup: StartupApi
    settings: SettingsApi
    llmUsage: LlmUsageApi
    settingsIntro: SettingsIntroApi
    autoUpdate: AutoUpdateApi
    quests: QuestsApi
    spellbook: SpellbookApi
    startingLoadout: StartingLoadoutApi
    race: RaceApi
    background: BackgroundApi
    npcDossier: NpcDossierApi
    askDm: AskDmApi
  }
}
