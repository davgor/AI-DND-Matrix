import { IN_CAMPAIGN_COLUMN_MIN_WIDTHS, type InCampaignLayoutMode } from './types'

export const IN_CAMPAIGN_BREAKPOINTS = {
  fourColumn: 1280,
  sheetOverlay: 1024
} as const

export function resolveInCampaignLayoutMode(viewportWidth: number): InCampaignLayoutMode {
  if (viewportWidth >= IN_CAMPAIGN_BREAKPOINTS.fourColumn) {
    return 'four-column'
  }
  if (viewportWidth >= IN_CAMPAIGN_BREAKPOINTS.sheetOverlay) {
    return 'sheet-overlay'
  }
  return 'compact'
}

export function minimumWidthForFourColumns(): number {
  const widths = IN_CAMPAIGN_COLUMN_MIN_WIDTHS
  return (
    widths.campaignsExpanded +
    widths.dmExposition +
    widths.playerInteraction +
    widths.playerSheetExpanded
  )
}
