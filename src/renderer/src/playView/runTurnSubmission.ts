import type { TurnResult } from '../../../main/turnIpc'
import type { DyingResolution } from '../../../main/dyingResolution'
import type { Alignment, PendingAlignmentShift } from '../../../shared/alignment/types'
import type { CombatStateSnapshot } from '../../../shared/combat/types'
import type { FleeTurnOutcome } from '../../../shared/combat/flee/types'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import {
  createCampaignActionTurnId,
  logRendererCampaignAction
} from './campaignActionTrace'
import { idleExposition, resolvePlayerTurn } from './submitPlayerTurn'

function playerImprisonedFromStats(stats: unknown): boolean {
  const defeat = (stats as { playerDefeatState?: { imprisoned?: boolean } } | undefined)?.playerDefeatState
  return defeat?.imprisoned === true
}

function buildTurnSubmissionResult(
  result: TurnResult,
  player: { alignment?: Alignment | null; stats?: unknown } | undefined,
  characterRefreshToken: number
) {
  return {
    lastCheck: result.check ?? null,
    characterRefreshToken: characterRefreshToken + 1,
    expositionStatus: idleExposition(),
    pendingAlignmentShift: result.pendingAlignmentShift,
    playerAlignment: player?.alignment ?? null,
    combatState: result.combatState ?? null,
    fleeOutcome: result.fleeOutcome ?? null,
    defeatDispositionNarration: result.defeatDispositionNarration ?? null,
    xpNarration: result.xpNarration ?? null,
    lootNarration: result.lootNarration ?? null,
    playerImprisoned: playerImprisonedFromStats(player?.stats),
    dyingResolution: result.dyingResolution
  }
}

async function resolveTurnWithClientTrace(input: {
  campaignId: string
  characterId: string
  playerInput: string
  turnId: string
}): Promise<TurnResult> {
  try {
    return await resolvePlayerTurn({
      campaignId: input.campaignId,
      characterId: input.characterId,
      playerInput: input.playerInput,
      clientTraceId: input.turnId
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
  return buildTurnSubmissionResult(result, player, input.characterRefreshToken)
}

export async function runTurnSubmission(input: {
  campaignId: string
  characterId: string
  playerInput: string
  playLog: PlayLogController
  promotion: PromotionPromptController
  characterRefreshToken: number
}): Promise<{
  lastCheck: TurnResult['check'] | null
  characterRefreshToken: number
  expositionStatus: ExpositionStatus
  pendingAlignmentShift: PendingAlignmentShift | null
  playerAlignment: Alignment | null
  combatState: CombatStateSnapshot | null
  fleeOutcome: FleeTurnOutcome | null
  defeatDispositionNarration: string | null
  xpNarration: string | null
  lootNarration: string | null
  playerImprisoned: boolean
  dyingResolution?: DyingResolution
}> {
  const turnId = createCampaignActionTurnId()
  logRendererCampaignAction('ui_submit', {
    turnId,
    campaignId: input.campaignId,
    characterId: input.characterId,
    playerInput: input.playerInput
  })
  const result = await resolveTurnWithClientTrace({
    campaignId: input.campaignId,
    characterId: input.characterId,
    playerInput: input.playerInput,
    turnId
  })
  return finalizeTurnSubmission(input, result)
}
