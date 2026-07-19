import {
  CAMPAIGN_ACTION_TRACE_PREFIX,
  createCampaignActionTurnId,
  truncateTraceText,
  type CampaignActionTracePhase
} from '../../../shared/debug/campaignActionTrace'

export { createCampaignActionTurnId }

function isRendererTraceEnabled(): boolean {
  return import.meta.env.DEV === true
}

/** DEV-only Play View breadcrumb; correlates with main via `clientTraceId`. */
export function logRendererCampaignAction(
  phase: Extract<CampaignActionTracePhase, 'ui_submit' | 'error'>,
  detail: {
    turnId: string
    campaignId: string
    characterId: string
    playerInput?: string
    error?: string
  }
): void {
  if (!isRendererTraceEnabled()) {
    return
  }
  const payload = {
    phase,
    turnId: detail.turnId,
    campaignId: detail.campaignId,
    characterId: detail.characterId,
    ...(detail.playerInput !== undefined
      ? { playerInput: truncateTraceText(detail.playerInput) }
      : {}),
    ...(detail.error !== undefined ? { error: detail.error } : {})
  }
  console.debug(CAMPAIGN_ACTION_TRACE_PREFIX, phase, payload)
}
