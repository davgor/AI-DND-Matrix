import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import { idleExposition } from './submitPlayerTurn'
import { useAlignmentCombatBootstrap } from './useAlignmentCombatBootstrap'
import {
  createAbortTurnFailureAction,
  createRetryTurnFailureAction,
  createSubmitAction
} from './useTurnSubmitAction'
import { useTurnSubmissionState } from './useTurnSubmissionState'
import type { useObituaryDrafting } from './useObituaryDrafting'

function buildTurnSubmissionReturn(input: {
  state: ReturnType<typeof useTurnSubmissionState>
  alignmentCombat: ReturnType<typeof useAlignmentCombatBootstrap>
  submitAction: ReturnType<typeof createSubmitAction>
  retryTurnFailure: () => Promise<void>
  abortTurnFailure: ReturnType<typeof createAbortTurnFailureAction>
  playLog: PlayLogController
}) {
  const { state, alignmentCombat, submitAction, retryTurnFailure, abortTurnFailure, playLog } = input
  return {
    inputValue: state.inputValue,
    setInputValue: state.setInputValue,
    submitting: state.submitting,
    submitAction,
    lastCheck: state.lastCheck,
    expositionStatus: state.expositionStatus,
    turnFailure: state.turnFailure,
    retryTurnFailure: () => {
      void retryTurnFailure()
    },
    abortTurnFailure,
    retryExposition: () => {
      if (state.turnFailure?.retryable) {
        void retryTurnFailure()
        return
      }
      state.setExpositionStatus(idleExposition())
      void playLog.refreshLog()
    },
    characterRefreshToken: state.characterRefreshToken,
    pendingAlignmentShift: alignmentCombat.pendingAlignmentShift,
    playerAlignment: alignmentCombat.playerAlignment,
    combatState: alignmentCombat.combatState,
    fleeOutcome: state.fleeOutcome,
    defeatDispositionNarration: state.defeatDispositionNarration,
    xpNarration: state.xpNarration,
    lootNarration: state.lootNarration,
    lockoutNarration: state.lockoutNarration,
    spellGrantNarration: state.spellGrantNarration,
    commerceTravelFeedback: state.commerceTravelFeedback,
    playerImprisoned: state.playerImprisoned,
    notifyPerkChosen: () => state.setCharacterRefreshToken((token) => token + 1)
  }
}

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
  const submitInput = { ...input, state, alignmentCombat }
  return buildTurnSubmissionReturn({
    state,
    alignmentCombat,
    submitAction: createSubmitAction(submitInput),
    retryTurnFailure: createRetryTurnFailureAction(submitInput),
    abortTurnFailure: createAbortTurnFailureAction(submitInput),
    playLog: input.playLog
  })
}
