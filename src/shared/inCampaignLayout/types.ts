export type InCampaignColumn = 'campaigns' | 'dmExposition' | 'playerInteraction' | 'playerSheet'

export const IN_CAMPAIGN_COLUMNS: InCampaignColumn[] = [
  'campaigns',
  'dmExposition',
  'playerInteraction',
  'playerSheet'
]

export const IN_CAMPAIGN_COLUMN_MIN_WIDTHS = {
  campaignsExpanded: 200,
  campaignsCollapsed: 36,
  dmExposition: 240,
  playerInteraction: 220,
  playerSheetExpanded: 240,
  playerSheetCollapsed: 36
} as const

export type InCampaignLayoutMode = 'four-column' | 'sheet-overlay' | 'compact'

export type ExpositionState = 'idle' | 'loading' | 'error'

export interface ExpositionStatus {
  state: ExpositionState
  errorMessage: string | null
}
