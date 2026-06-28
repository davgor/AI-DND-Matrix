import type { CampaignsApi, CharactersApi, FilesApi, TurnApi, WindowControls } from '../../preload'

declare global {
  interface Window {
    windowControls: WindowControls
    campaigns: CampaignsApi
    files: FilesApi
    characters: CharactersApi
    turn: TurnApi
  }
}
