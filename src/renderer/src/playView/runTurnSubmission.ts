import type { TurnResult } from '../../../main/turnIpc'
import type { Alignment, PendingAlignmentShift } from '../../../shared/alignment/types'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import { idleExposition, resolvePlayerTurn } from './submitPlayerTurn'

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
  return {
    lastCheck: result.check ?? null,
    characterRefreshToken: input.characterRefreshToken + 1,
    expositionStatus: idleExposition(),
    pendingAlignmentShift: result.pendingAlignmentShift,
    playerAlignment: player?.alignment ?? null
  }
}
