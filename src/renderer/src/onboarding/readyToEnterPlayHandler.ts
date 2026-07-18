import type { CampaignDetail } from '../../../main/campaignIpc'
import {
  campaignPlayBlockerMessage,
  canEnterCampaignPlay,
  getCampaignPlayBlockers
} from '../../../shared/campaignPlay/campaignPlayReady'

export function createReadyToEnterPlayHandler(input: {
  detail: CampaignDetail | null
  campaignId: string
  characterId: string
  refreshDetail: () => Promise<void>
  setEnterPlayBlockerMessage: (message: string | null) => void
  onEnterPlay: (characterId: string) => void
}): () => Promise<void> {
  return async () => {
    if (!input.detail) {
      return
    }

    const blockers = getCampaignPlayBlockers(input.detail)
    if (!canEnterCampaignPlay(input.detail)) {
      input.setEnterPlayBlockerMessage(campaignPlayBlockerMessage(blockers))
      return
    }

    try {
      const result = await window.guidedCreation.readyToEnterPlay({
        campaignId: input.campaignId,
        characterId: input.characterId
      })
      if (!result.ok) {
        input.setEnterPlayBlockerMessage('Could not enter play. Try again.')
        return
      }

      await input.refreshDetail()
      input.setEnterPlayBlockerMessage(null)
      input.onEnterPlay(input.characterId)
    } catch {
      input.setEnterPlayBlockerMessage('Could not enter play. Try again.')
    }
  }
}
