import type {
  AutoUpdateApi,
  CampaignsApi,
  CharactersApi,
  CombatApi,
  FilesApi,
  GuidedCreationApi,
  ProgressionApi,
  SettingsApi,
  SettingsIntroApi,
  StartupApi,
  TurnApi,
  WindowControls
} from '../../preload'

declare global {
  interface Window {
    windowControls: WindowControls
    campaigns: CampaignsApi
    files: FilesApi
    characters: CharactersApi
    guidedCreation: GuidedCreationApi
    turn: TurnApi
    combat: CombatApi
    progression: ProgressionApi
    startup: StartupApi
    settings: SettingsApi
    settingsIntro: SettingsIntroApi
    autoUpdate: AutoUpdateApi
  }
}
