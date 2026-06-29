import type { TurnResult } from '../../../main/turnIpc'
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
}> {
  const result = await resolvePlayerTurn({
    campaignId: input.campaignId,
    characterId: input.characterId,
    playerInput: input.playerInput
  })
  input.promotion.setProposed(result.proposedPromotion ?? null)
  await input.playLog.refreshLog()
  return {
    lastCheck: result.check ?? null,
    characterRefreshToken: input.characterRefreshToken + 1,
    expositionStatus: idleExposition()
  }
}
