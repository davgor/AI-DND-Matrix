import {
  filterDmExpositionEntries,
  filterPlayerInteractionEntries
} from '../../../shared/inCampaignLayout/sceneContext'
import { usePlayLog, type PlayLogController } from './usePlayLog'
import { useRollVisibility, type RollVisibilityController } from './useRollVisibility'
import { useSessionRecap, type SessionRecapController } from './useSessionRecap'
import { usePromotionPrompt, type PromotionPromptController } from './usePromotionPrompt'
import { useTurnSubmission } from './useTurnSubmission'

export interface PlayViewController extends RollVisibilityController, PlayLogController {
  dmEntries: ReturnType<typeof filterDmExpositionEntries>
  playerEntries: ReturnType<typeof filterPlayerInteractionEntries>
  inputValue: string
  setInputValue: (value: string) => void
  submitting: boolean
  submitAction: () => Promise<void>
  lastCheck: ReturnType<typeof useTurnSubmission>['lastCheck']
  expositionStatus: ReturnType<typeof useTurnSubmission>['expositionStatus']
  retryExposition: () => void
  characterRefreshToken: number
  recap: SessionRecapController
  promotion: PromotionPromptController
}

export function usePlayViewController(campaignId: string, characterId: string): PlayViewController {
  const rollVisibility = useRollVisibility()
  const recap = useSessionRecap(campaignId)
  const playLog = usePlayLog(campaignId, (entries) => {
    if (entries.length > 0) {
      recap.show()
    }
  })
  const promotion = usePromotionPrompt(campaignId, () => void playLog.refreshLog())
  const turn = useTurnSubmission({ campaignId, characterId, playLog, promotion })

  return {
    dmEntries: filterDmExpositionEntries(playLog.log),
    playerEntries: filterPlayerInteractionEntries(playLog.log),
    ...turn,
    ...rollVisibility,
    ...playLog,
    recap,
    promotion
  }
}
