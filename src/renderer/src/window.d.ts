import type {
  CampaignsApi,
  CharactersApi,
  CombatApi,
  ProgressionApi,
  FilesApi,
  GuidedCreationApi,
  SettingsApi,
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
  }
}
