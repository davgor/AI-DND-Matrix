import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import { loadingExposition } from './submitPlayerTurn'
import { executeTurnSubmission } from './turnSubmissionActions'
import type { useAlignmentCombatBootstrap } from './useAlignmentCombatBootstrap'
import type { useTurnSubmissionState } from './useTurnSubmissionState'
import type { useObituaryDrafting } from './useObituaryDrafting'

export function createSubmitAction(input: {
  playLog: PlayLogController
  promotion: PromotionPromptController
  state: ReturnType<typeof useTurnSubmissionState>
  alignmentCombat: ReturnType<typeof useAlignmentCombatBootstrap>
  obituary: ReturnType<typeof useObituaryDrafting>
  campaignId: string
  characterId: string
}) {
  return async function submitAction(): Promise<void> {
    const { state, alignmentCombat } = input
    if (!state.inputValue.trim() || state.submitting) return
    state.setSubmitting(true)
    state.setExpositionStatus(loadingExposition())
    const outcome = await executeTurnSubmission({
      campaignId: input.campaignId,
      characterId: input.characterId,
      playLog: input.playLog,
      promotion: input.promotion,
      playerInput: state.inputValue,
      characterRefreshToken: state.characterRefreshToken
    })
    state.setInputValue('')
    state.setLastCheck(outcome.lastCheck)
    state.setCharacterRefreshToken(outcome.characterRefreshToken)
    state.setExpositionStatus(outcome.expositionStatus)
    alignmentCombat.setPendingAlignmentShift(outcome.pendingAlignmentShift)
    if (outcome.playerAlignment) alignmentCombat.setPlayerAlignment(outcome.playerAlignment)
    alignmentCombat.setCombatState(outcome.combatState)
    state.setFleeOutcome(outcome.fleeOutcome)
    state.setDefeatDispositionNarration(outcome.defeatDispositionNarration)
    state.setXpNarration(outcome.xpNarration)
    state.setLootNarration(outcome.lootNarration)
    state.setPlayerImprisoned(outcome.playerImprisoned)
    if (outcome.dyingResolution?.status === 'permanently_dead') {
      const characters = await window.characters.listByCampaign(input.campaignId)
      const player = characters.find((character) => character.id === input.characterId)
      input.obituary.beginObituaryDrafting({
        campaignId: input.campaignId,
        characterId: input.characterId,
        deathCause: player?.deathCause ?? undefined
      })
    }
    state.setSubmitting(false)
  }
}
