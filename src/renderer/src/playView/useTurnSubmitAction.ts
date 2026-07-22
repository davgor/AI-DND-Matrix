import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import { loadingExposition } from './submitPlayerTurn'
import { failedTurnSubmission } from './turnSubmissionFailure'
import { runTurnSubmission } from './runTurnSubmission'
import type { useAlignmentCombatBootstrap } from './useAlignmentCombatBootstrap'
import type { useTurnSubmissionState } from './useTurnSubmissionState'
import type { useObituaryDrafting } from './useObituaryDrafting'

type SubmitInput = {
  playLog: PlayLogController
  promotion: PromotionPromptController
  state: ReturnType<typeof useTurnSubmissionState>
  alignmentCombat: ReturnType<typeof useAlignmentCombatBootstrap>
  obituary: ReturnType<typeof useObituaryDrafting>
  campaignId: string
  characterId: string
}

async function applyTurnOutcome(
  input: SubmitInput,
  outcome: Awaited<ReturnType<typeof runTurnSubmission>> | ReturnType<typeof failedTurnSubmission>
): Promise<void> {
  const { state, alignmentCombat } = input
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
  state.setLockoutNarration(outcome.lockoutNarration)
  state.setSpellGrantNarration(outcome.spellGrantNarration)
  state.setPlayerImprisoned(outcome.playerImprisoned)
  if (outcome.dyingResolution?.status !== 'permanently_dead') {
    return
  }
  const characters = await window.characters.listByCampaign(input.campaignId)
  const player = characters.find((character) => character.id === input.characterId)
  input.obituary.beginObituaryDrafting({
    campaignId: input.campaignId,
    characterId: input.characterId,
    deathCause: player?.deathCause ?? undefined
  })
}

export function createSubmitAction(input: SubmitInput) {
  return async function submitAction(): Promise<void> {
    const { state } = input
    if (!state.inputValue.trim() || state.submitting) return
    const playerInput = state.inputValue
    input.playLog.appendOptimisticPlayerInput(playerInput)
    state.setInputValue('')
    state.setSubmitting(true)
    state.setExpositionStatus(loadingExposition())
    let outcome
    try {
      outcome = await runTurnSubmission({
        campaignId: input.campaignId,
        characterId: input.characterId,
        playLog: input.playLog,
        promotion: input.promotion,
        playerInput,
        characterRefreshToken: state.characterRefreshToken
      })
    } catch {
      outcome = failedTurnSubmission(state.characterRefreshToken)
    }
    await applyTurnOutcome(input, outcome)
    state.setSubmitting(false)
  }
}
