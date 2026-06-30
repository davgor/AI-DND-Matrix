import type { DyingResolution } from '../../../main/dyingResolution'
import type { FleeTurnOutcome } from '../../../shared/combat/flee/types'
import type { CombatStateSnapshot } from '../../../shared/combat/types'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { Alignment, PendingAlignmentShift } from '../../../shared/alignment/types'
import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import { failedTurnSubmission } from './turnSubmissionFailure'
import { runTurnSubmission } from './runTurnSubmission'

export async function refreshPlayerAlignmentState(
  campaignId: string,
  characterId: string
): Promise<{ alignment: Alignment | null; pending: PendingAlignmentShift | null }> {
  const characters = await window.characters.listByCampaign(campaignId)
  const character = characters.find((entry) => entry.id === characterId)
  return {
    alignment: character?.alignment ?? null,
    pending: character?.pendingAlignmentShift ?? null
  }
}

export async function executeTurnSubmission(input: {
  campaignId: string
  characterId: string
  playerInput: string
  characterRefreshToken: number
  playLog: PlayLogController
  promotion: PromotionPromptController
}): Promise<{
  expositionStatus: ExpositionStatus
  lastCheck: import('../../../main/turnIpc').TurnResult['check'] | null
  characterRefreshToken: number
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
  try {
    const outcome = await runTurnSubmission(input)
    return {
      expositionStatus: outcome.expositionStatus,
      lastCheck: outcome.lastCheck,
      characterRefreshToken: outcome.characterRefreshToken,
      pendingAlignmentShift: outcome.pendingAlignmentShift,
      playerAlignment: outcome.playerAlignment,
      combatState: outcome.combatState,
      fleeOutcome: outcome.fleeOutcome,
      defeatDispositionNarration: outcome.defeatDispositionNarration,
      xpNarration: outcome.xpNarration,
      lootNarration: outcome.lootNarration,
      playerImprisoned: outcome.playerImprisoned,
      dyingResolution: outcome.dyingResolution
    }
  } catch {
    return failedTurnSubmission(input.characterRefreshToken)
  }
}
