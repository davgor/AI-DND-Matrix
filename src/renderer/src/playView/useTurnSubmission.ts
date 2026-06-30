import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import type { useObituaryDrafting } from './useObituaryDrafting'
import { idleExposition } from './submitPlayerTurn'
import { useAlignmentCombatBootstrap } from './useAlignmentCombatBootstrap'
import { createSubmitAction } from './useTurnSubmitAction'
import { useTurnSubmissionState } from './useTurnSubmissionState'

export function useTurnSubmission(input: {
  campaignId: string
  characterId: string
  playLog: PlayLogController
  promotion: PromotionPromptController
  obituary: ReturnType<typeof useObituaryDrafting>
}) {
  const state = useTurnSubmissionState()
  const alignmentCombat = useAlignmentCombatBootstrap(
    input.campaignId,
    input.characterId,
    state.characterRefreshToken
  )
  const submitAction = createSubmitAction({ ...input, state, alignmentCombat })

  return {
    inputValue: state.inputValue,
    setInputValue: state.setInputValue,
    submitting: state.submitting,
    submitAction,
    lastCheck: state.lastCheck,
    expositionStatus: state.expositionStatus,
    retryExposition: () => {
      state.setExpositionStatus(idleExposition())
      void input.playLog.refreshLog()
    },
    characterRefreshToken: state.characterRefreshToken,
    pendingAlignmentShift: alignmentCombat.pendingAlignmentShift,
    playerAlignment: alignmentCombat.playerAlignment,
    combatState: alignmentCombat.combatState,
    fleeOutcome: state.fleeOutcome,
    defeatDispositionNarration: state.defeatDispositionNarration,
    xpNarration: state.xpNarration,
    lootNarration: state.lootNarration,
    playerImprisoned: state.playerImprisoned,
    notifyPerkChosen: () => state.setCharacterRefreshToken((token) => token + 1)
  }
}
