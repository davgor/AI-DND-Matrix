/** Shared campaign-action trace helpers (DEV debugging; no telemetry). */

export const CAMPAIGN_ACTION_TRACE_PREFIX = '[campaignAction]' as const

const TRACE_PLAYER_INPUT_MAX = 160

export type CampaignActionTracePhase =
  | 'ui_submit'
  | 'ipc_start'
  | 'intent_route'
  | 'branch'
  | 'beats'
  | 'complete'
  | 'error'

export function createCampaignActionTurnId(): string {
  return `turn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function truncateTraceText(text: string, maxLen = TRACE_PLAYER_INPUT_MAX): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLen) {
    return normalized
  }
  if (maxLen <= 1) {
    return '…'
  }
  return `${normalized.slice(0, maxLen - 1)}…`
}
