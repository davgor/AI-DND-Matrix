import type { AutoUpdateApi, CampaignsApi, CharactersApi, LogBookApi, CombatApi, FilesApi, GuidedCreationApi, ProgressionApi, QuestsApi, SettingsApi, SettingsIntroApi, SpellbookApi, StartupApi, StartingLoadoutApi, TurnApi, WindowControls } from '../../preload'

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
    settingsIntro: SettingsIntroApi
    autoUpdate: AutoUpdateApi
    quests: QuestsApi
    spellbook: SpellbookApi
    startingLoadout: StartingLoadoutApi
  }
}
