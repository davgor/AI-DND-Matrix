import type { TurnResult } from '../../../main/turnIpc'
import type { Alignment } from '../../../shared/alignment/types'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PendingTurnFailure } from '../../../shared/playResilience/types'
import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import {
  createCampaignActionTurnId,
  logRendererCampaignAction
} from './campaignActionTrace'
import { failedExposition, idleExposition, resolvePlayerTurn } from './submitPlayerTurn'

function playerImprisonedFromStats(stats: unknown): boolean {
  const defeat = (stats as { playerDefeatState?: { imprisoned?: boolean } } | undefined)?.playerDefeatState
  return defeat?.imprisoned === true
}

function buildTurnNarrationFields(result: TurnResult) {
  return {
    defeatDispositionNarration: result.defeatDispositionNarration ?? null,
    xpNarration: result.xpNarration ?? null,
    lootNarration: result.lootNarration ?? null,
    lockoutNarration: result.lockoutNarration ?? null,
    spellGrantNarration: result.spellGrantNarration ?? null,
    commerceTravelFeedback: result.commerceTravelFeedback ?? null
  }
}

function buildTurnCombatFields(result: TurnResult) {
  return {
    pendingAlignmentShift: result.pendingAlignmentShift,
    combatState: result.combatState ?? null,
    fleeOutcome: result.fleeOutcome ?? null,
    dyingResolution: result.dyingResolution
  }
}

function buildTurnSubmissionSuccess(
  result: TurnResult,
  player: { alignment?: Alignment | null; stats?: unknown } | undefined,
  characterRefreshToken: number
) {
  return {
    kind: 'success' as const,
    lastCheck: result.check ?? null,
    characterRefreshToken: characterRefreshToken + 1,
    expositionStatus: idleExposition(),
    playerAlignment: player?.alignment ?? null,
    playerImprisoned: playerImprisonedFromStats(player?.stats),
    ...buildTurnCombatFields(result),
    ...buildTurnNarrationFields(result)
  }
}

async function resolveTurnWithClientTrace(input: {
  campaignId: string
  characterId: string
  playerInput: string
  turnId: string
  turnAttemptId: string
}) {
  try {
    return await resolvePlayerTurn({
      campaignId: input.campaignId,
      characterId: input.characterId,
      playerInput: input.playerInput,
      clientTraceId: input.turnId,
      turnAttemptId: input.turnAttemptId
    })
  } catch (error) {
    logRendererCampaignAction('error', {
      turnId: input.turnId,
      campaignId: input.campaignId,
      characterId: input.characterId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

async function finalizeTurnSubmission(
  input: {
    campaignId: string
    characterId: string
    playLog: PlayLogController
    promotion: PromotionPromptController
    characterRefreshToken: number
  },
  result: TurnResult
) {
  input.promotion.setProposed(result.proposedPromotion ?? null)
  await input.playLog.refreshLog()
  const characters = await window.characters.listByCampaign(input.campaignId)
  const player = characters.find((character) => character.id === input.characterId)
  return buildTurnSubmissionSuccess(result, player, input.characterRefreshToken)
}

type TurnSubmissionSuccess = Awaited<ReturnType<typeof finalizeTurnSubmission>>

type TurnSubmissionFailure = {
  kind: 'failure'
  failure: PendingTurnFailure
  characterRefreshToken: number
  expositionStatus: ExpositionStatus
}

export type TurnSubmissionOutcome = TurnSubmissionSuccess | TurnSubmissionFailure

export async function runTurnSubmission(input: {
  campaignId: string
  characterId: string
  playerInput: string
  playLog: PlayLogController
  promotion: PromotionPromptController
  characterRefreshToken: number
  turnAttemptId?: string
}): Promise<TurnSubmissionOutcome> {
  const turnId = createCampaignActionTurnId()
  const turnAttemptId = input.turnAttemptId ?? createCampaignActionTurnId()
  logRendererCampaignAction('ui_submit', {
    turnId,
    campaignId: input.campaignId,
    characterId: input.characterId,
    playerInput: input.playerInput
  })
  const resolved = await resolveTurnWithClientTrace({
    campaignId: input.campaignId,
    characterId: input.characterId,
    playerInput: input.playerInput,
    turnId,
    turnAttemptId
  })
  if (!resolved.ok) {
    return {
      kind: 'failure',
      characterRefreshToken: input.characterRefreshToken,
      expositionStatus: failedExposition(resolved.message),
      failure: {
        category: resolved.category,
        message: resolved.message,
        retryable: resolved.retryable,
        turnAttemptId: resolved.turnAttemptId || turnAttemptId,
        playerInput: input.playerInput
      }
    }
  }
  return finalizeTurnSubmission(input, resolved.result)
}
