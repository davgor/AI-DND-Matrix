import type { CampaignsApi, WindowControls } from '../../preload'

declare global {
  interface Window {
    windowControls: WindowControls
    campaigns: CampaignsApi
  }
}
