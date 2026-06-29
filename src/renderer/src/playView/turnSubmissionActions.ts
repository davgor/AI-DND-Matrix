import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { Alignment, PendingAlignmentShift } from '../../../shared/alignment/types'
import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import { failedExposition } from './submitPlayerTurn'
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
}> {
  try {
    const outcome = await runTurnSubmission(input)
    return {
      expositionStatus: outcome.expositionStatus,
      lastCheck: outcome.lastCheck,
      characterRefreshToken: outcome.characterRefreshToken,
      pendingAlignmentShift: outcome.pendingAlignmentShift,
      playerAlignment: outcome.playerAlignment
    }
  } catch {
    return {
      expositionStatus: failedExposition('Could not update the scene. Check your connection and try again.'),
      lastCheck: null,
      characterRefreshToken: input.characterRefreshToken,
      pendingAlignmentShift: null,
      playerAlignment: null
    }
  }
}
