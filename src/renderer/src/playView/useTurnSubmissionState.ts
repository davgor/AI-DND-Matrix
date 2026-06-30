import { useState } from 'react'
import type { TurnResult } from '../../../main/turnIpc'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { FleeTurnOutcome } from '../../../shared/combat/flee/types'
import { idleExposition } from './submitPlayerTurn'

export function useTurnSubmissionState() {
  const [inputValue, setInputValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastCheck, setLastCheck] = useState<TurnResult['check'] | null>(null)
  const [characterRefreshToken, setCharacterRefreshToken] = useState(0)
  const [expositionStatus, setExpositionStatus] = useState<ExpositionStatus>(idleExposition())
  const [fleeOutcome, setFleeOutcome] = useState<FleeTurnOutcome | null>(null)
  const [defeatDispositionNarration, setDefeatDispositionNarration] = useState<string | null>(null)
  const [lootNarration, setLootNarration] = useState<string | null>(null)
  const [xpNarration, setXpNarration] = useState<string | null>(null)
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
    fleeOutcome,
    setFleeOutcome,
    defeatDispositionNarration,
    setDefeatDispositionNarration,
    lootNarration,
    setLootNarration,
    xpNarration,
    setXpNarration,
    playerImprisoned,
    setPlayerImprisoned
  }
}
