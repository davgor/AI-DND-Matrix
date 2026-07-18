import type { CampaignDetail } from '../../../main/campaignIpc'
import { guardPlayEntry } from '../../../shared/campaignPlay/campaignPlayReady'
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
    if (!guardPlayEntry(input.detail, input.setEnterPlayBlockerMessage)) {
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
