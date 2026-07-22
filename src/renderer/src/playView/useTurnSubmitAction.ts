import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import { idleExposition, loadingExposition } from './submitPlayerTurn'
import { runTurnSubmission, type TurnSubmissionOutcome } from './runTurnSubmission'
import type { useAlignmentCombatBootstrap } from './useAlignmentCombatBootstrap'
import type { useTurnSubmissionState } from './useTurnSubmissionState'
import type { useObituaryDrafting } from './useObituaryDrafting'
import { turnFailureMessage } from '../../../shared/playResilience/turnFailureMessage'

type SubmitInput = {
  playLog: PlayLogController
  promotion: PromotionPromptController
  state: ReturnType<typeof useTurnSubmissionState>
  alignmentCombat: ReturnType<typeof useAlignmentCombatBootstrap>
  obituary: ReturnType<typeof useObituaryDrafting>
  campaignId: string
  characterId: string
}

async function applySuccessfulTurnOutcome(
  input: SubmitInput,
  outcome: Extract<TurnSubmissionOutcome, { kind: 'success' }>
): Promise<void> {
  const { state, alignmentCombat } = input
  state.setTurnFailure(null)
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
  state.setCommerceTravelFeedback(outcome.commerceTravelFeedback)
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

function applyFailedTurnOutcome(
  input: SubmitInput,
  outcome: Extract<TurnSubmissionOutcome, { kind: 'failure' }>
): void {
  input.state.setTurnFailure(outcome.failure)
  input.state.setExpositionStatus(outcome.expositionStatus)
}

async function applyTurnOutcome(input: SubmitInput, outcome: TurnSubmissionOutcome): Promise<void> {
  if (outcome.kind === 'failure') {
    applyFailedTurnOutcome(input, outcome)
    return
  }
  await applySuccessfulTurnOutcome(input, outcome)
}

async function executeTurnSubmission(
  input: SubmitInput,
  playerInput: string,
  turnAttemptId?: string
): Promise<void> {
  const { state } = input
  state.setSubmitting(true)
  state.setExpositionStatus(loadingExposition())
  try {
    const outcome = await runTurnSubmission({
      campaignId: input.campaignId,
      characterId: input.characterId,
      playLog: input.playLog,
      promotion: input.promotion,
      playerInput,
      characterRefreshToken: state.characterRefreshToken,
      turnAttemptId
    })
    await applyTurnOutcome(input, outcome)
  } catch {
    state.setTurnFailure(null)
    state.setExpositionStatus({
      state: 'error',
      errorMessage: turnFailureMessage('internal_error')
    })
  } finally {
    state.setSubmitting(false)
  }
}

export function createSubmitAction(input: SubmitInput) {
  return async function submitAction(): Promise<void> {
    const { state } = input
    if (!state.inputValue.trim() || state.submitting) return
    const playerInput = state.inputValue
    input.playLog.appendOptimisticPlayerInput(playerInput)
    state.setInputValue('')
    state.setTurnFailure(null)
    await executeTurnSubmission(input, playerInput)
  }
}

export function createRetryTurnFailureAction(input: SubmitInput) {
  return async function retryTurnFailure(): Promise<void> {
    const failure = input.state.turnFailure
    if (!failure?.retryable || input.state.submitting) return
    await executeTurnSubmission(input, failure.playerInput, failure.turnAttemptId)
  }
}

export function createAbortTurnFailureAction(input: SubmitInput) {
  return function abortTurnFailure(): void {
    input.state.setTurnFailure(null)
    input.state.setExpositionStatus(idleExposition())
    void input.playLog.refreshLog()
  }
}
