import type {
  CampaignsApi,
  CharactersApi,
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
    startup: StartupApi
    settings: SettingsApi
  }
}
