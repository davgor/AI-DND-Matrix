import { useState } from 'react'
import type { TurnResult } from '../../../main/turnIpc'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PendingTurnFailure } from '../../../shared/playResilience/types'
import type { FleeTurnOutcome } from '../../../shared/combat/flee/types'
import { idleExposition } from './submitPlayerTurn'

export function useTurnSubmissionState() {
  const [inputValue, setInputValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastCheck, setLastCheck] = useState<TurnResult['check'] | null>(null)
  const [characterRefreshToken, setCharacterRefreshToken] = useState(0)
  const [expositionStatus, setExpositionStatus] = useState<ExpositionStatus>(idleExposition())
  const [turnFailure, setTurnFailure] = useState<PendingTurnFailure | null>(null)
  const [fleeOutcome, setFleeOutcome] = useState<FleeTurnOutcome | null>(null)
  const [defeatDispositionNarration, setDefeatDispositionNarration] = useState<string | null>(null)
  const [lootNarration, setLootNarration] = useState<string | null>(null)
  const [xpNarration, setXpNarration] = useState<string | null>(null)
  const [lockoutNarration, setLockoutNarration] = useState<string | null>(null)
  const [spellGrantNarration, setSpellGrantNarration] = useState<string | null>(null)
  const [commerceTravelFeedback, setCommerceTravelFeedback] = useState<string | null>(null)
  const [playerImprisoned, setPlayerImprisoned] = useState(false)
  return {
    inputValue,
    setInputValue,
    submitting,
    setSubmitting,
    lastCheck,
    setLastCheck,
    characterRefreshToken,
    setCharacterRefreshToken,
    expositionStatus,
    setExpositionStatus,
    turnFailure,
    setTurnFailure,
    fleeOutcome,
    setFleeOutcome,
    defeatDispositionNarration,
    setDefeatDispositionNarration,
    lootNarration,
    setLootNarration,
    xpNarration,
    setXpNarration,
    lockoutNarration,
    setLockoutNarration,
    spellGrantNarration,
    setSpellGrantNarration,
    commerceTravelFeedback,
    setCommerceTravelFeedback,
    playerImprisoned,
    setPlayerImprisoned
  }
}
