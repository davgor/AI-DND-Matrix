import {
  filterDmExpositionEntries,
  filterSocialEntries
} from '../../../shared/inCampaignLayout/sceneContext'
import type { Alignment, PendingAlignmentShift } from '../../../shared/alignment/types'
import type { CombatStateSnapshot } from '../../../shared/combat/types'
import type { FleeTurnOutcome } from '../../../shared/combat/flee/types'
import { usePlayLog, type PlayLogController } from './usePlayLog'
import { useRollVisibility, type RollVisibilityController } from './useRollVisibility'
import { useSessionRecap, type SessionRecapController } from './useSessionRecap'
import { usePromotionPrompt, type PromotionPromptController } from './usePromotionPrompt'
import { useTurnSubmission } from './useTurnSubmission'
import { useObituaryDrafting } from './useObituaryDrafting'

export interface PlayViewController extends RollVisibilityController, PlayLogController {
  dmEntries: ReturnType<typeof filterDmExpositionEntries>
  playerEntries: ReturnType<typeof filterSocialEntries>
  inputValue: string
  setInputValue: (value: string) => void
  submitting: boolean
  submitAction: () => Promise<void>
  lastCheck: ReturnType<typeof useTurnSubmission>['lastCheck']
  expositionStatus: ReturnType<typeof useTurnSubmission>['expositionStatus']
  turnFailure: ReturnType<typeof useTurnSubmission>['turnFailure']
  retryExposition: () => void
  abortTurnFailure: () => void
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
  lockoutNarration: string | null
  spellGrantNarration: string | null
  commerceTravelFeedback: string | null
  playerImprisoned: boolean
  notifyPerkChosen: () => void
  obituaryRequest: ReturnType<typeof useObituaryDrafting>['obituaryRequest']
  clearObituaryDrafting: () => void
  obituaryBlocking: boolean
}

export function usePlayViewController(campaignId: string, characterId: string): PlayViewController {
  const rollVisibility = useRollVisibility()
  const recap = useSessionRecap(campaignId)
  const playLog = usePlayLog(campaignId, characterId)
  const promotion = usePromotionPrompt(campaignId, () => void playLog.refreshLog())
  const obituary = useObituaryDrafting()
  const turn = useTurnSubmission({ campaignId, characterId, playLog, promotion, obituary })

  return {
    dmEntries: filterDmExpositionEntries(playLog.log),
    playerEntries: filterSocialEntries(playLog.log),
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
    lockoutNarration: turn.lockoutNarration,
    spellGrantNarration: turn.spellGrantNarration,
    commerceTravelFeedback: turn.commerceTravelFeedback,
    playerImprisoned: turn.playerImprisoned,
    notifyPerkChosen: turn.notifyPerkChosen,
    obituaryRequest: obituary.obituaryRequest,
    clearObituaryDrafting: obituary.clearObituaryDrafting,
    obituaryBlocking: obituary.obituaryBlocking
  }
}
