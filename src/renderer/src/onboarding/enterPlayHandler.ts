import type { CampaignDetail } from '../../../main/campaignIpc'
import {
  campaignPlayBlockerMessage,
  canEnterCampaignPlay,
  getCampaignPlayBlockers
} from '../../../shared/campaignPlay/campaignPlayReady'
import {
  findIncompletePlayerCharacter,
  findPlayerCharacter
} from '../../../shared/guidedCreation/stageRouting'

export function createEnterPlayHandler(input: {
  detail: CampaignDetail | null
  setEnterPlayBlockerMessage: (message: string | null) => void
  onEnterPlay: (characterId: string) => void
}): () => void {
  return () => {
    if (!input.detail) {
      return
    }
    const blockers = getCampaignPlayBlockers(input.detail)
    if (!canEnterCampaignPlay(input.detail)) {
      input.setEnterPlayBlockerMessage(campaignPlayBlockerMessage(blockers))
      return
    }
    const player =
      findIncompletePlayerCharacter(input.detail.characters) ??
      findPlayerCharacter(input.detail.characters)
    if (!player) {
      return
    }
    input.setEnterPlayBlockerMessage(null)
    input.onEnterPlay(player.id)
  }
}
