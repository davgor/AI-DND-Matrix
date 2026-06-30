import {
  filterDmExpositionEntries,
  filterPlayerInteractionEntries
} from '../../../shared/inCampaignLayout/sceneContext'
import type { Alignment, PendingAlignmentShift } from '../../../shared/alignment/types'
import type { CombatStateSnapshot } from '../../../shared/combat/types'
import type { FleeTurnOutcome } from '../../../shared/combat/flee/types'
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
  pendingAlignmentShift: PendingAlignmentShift | null
  playerAlignment: Alignment | null
  combatState: CombatStateSnapshot | null
  fleeOutcome: FleeTurnOutcome | null
  defeatDispositionNarration: string | null
  xpNarration: string | null
  lootNarration: string | null
  playerImprisoned: boolean
  notifyPerkChosen: () => void
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
    promotion,
    pendingAlignmentShift: turn.pendingAlignmentShift,
    playerAlignment: turn.playerAlignment,
    combatState: turn.combatState,
    fleeOutcome: turn.fleeOutcome,
    defeatDispositionNarration: turn.defeatDispositionNarration,
    xpNarration: turn.xpNarration,
    lootNarration: turn.lootNarration,
    playerImprisoned: turn.playerImprisoned,
    notifyPerkChosen: turn.notifyPerkChosen
  }
}
