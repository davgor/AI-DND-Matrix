import { AsyncLocalStorage } from 'node:async_hooks'
import {
  CAMPAIGN_ACTION_TRACE_PREFIX,
  type CampaignActionTracePhase,
  truncateTraceText
} from '../shared/debug/campaignActionTrace'
import { logger } from './logger'

export { createCampaignActionTurnId } from '../shared/debug/campaignActionTrace'

interface CampaignActionTraceContext {
  turnId: string
  campaignId: string
  characterId: string
  startedAt: number
}

const traceStorage = new AsyncLocalStorage<CampaignActionTraceContext>()

let enabledForTests: boolean | undefined

/** Test seam — pass `undefined` to restore `import.meta.env.DEV` gating. */
export function setCampaignActionTraceEnabledForTests(value: boolean | undefined): void {
  enabledForTests = value
}

function isCampaignActionTraceEnabled(): boolean {
  if (enabledForTests !== undefined) {
    return enabledForTests
  }
  // Vitest sets DEV=true; keep the suite quiet unless a test opts in.
  if (process.env.VITEST === 'true') {
    return false
  }
  return import.meta.env.DEV === true
}

export function runWithCampaignActionTrace<T>(
  ctx: {
    turnId: string
    campaignId: string
    characterId: string
    startedAt?: number
  },
  fn: () => Promise<T>
): Promise<T> {
  return traceStorage.run(
    {
      turnId: ctx.turnId,
      campaignId: ctx.campaignId,
      characterId: ctx.characterId,
      startedAt: ctx.startedAt ?? Date.now()
    },
    fn
  )
}

function buildCampaignActionPayload(
  phase: CampaignActionTracePhase,
  detail: Record<string, unknown>,
  ctx: CampaignActionTraceContext | undefined
): Record<string, unknown> {
  const playerInput =
    typeof detail.playerInput === 'string' ? truncateTraceText(detail.playerInput) : detail.playerInput
  return {
    phase,
    turnId: ctx?.turnId,
    campaignId: ctx?.campaignId ?? detail.campaignId,
    characterId: ctx?.characterId ?? detail.characterId,
    ...(ctx ? { durationMs: Date.now() - ctx.startedAt } : {}),
    ...detail,
    ...(playerInput !== undefined ? { playerInput } : {})
  }
}

export function logCampaignAction(
  phase: CampaignActionTracePhase,
  detail: Record<string, unknown> = {}
): void {
  if (!isCampaignActionTraceEnabled()) {
    return
  }
  const payload = buildCampaignActionPayload(phase, detail, traceStorage.getStore())
  console.debug(CAMPAIGN_ACTION_TRACE_PREFIX, phase, payload)
  logger.debug(CAMPAIGN_ACTION_TRACE_PREFIX, payload)
}
