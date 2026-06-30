import type { TurnResult } from '../../../main/turnIpc'
import type { DyingResolution } from '../../../main/dyingResolution'
import type { Alignment, PendingAlignmentShift } from '../../../shared/alignment/types'
import type { CombatStateSnapshot } from '../../../shared/combat/types'
import type { FleeTurnOutcome } from '../../../shared/combat/flee/types'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
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
  const result = await resolvePlayerTurn({
    campaignId: input.campaignId,
    characterId: input.characterId,
    playerInput: input.playerInput
  })
  input.promotion.setProposed(result.proposedPromotion ?? null)
  await input.playLog.refreshLog()
  const characters = await window.characters.listByCampaign(input.campaignId)
  const player = characters.find((character) => character.id === input.characterId)
  return buildTurnSubmissionResult(result, player, input.characterRefreshToken)
}
