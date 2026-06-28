import { useEffect, useState } from 'react'
import type { PlayLogEntry } from '../../../main/narrationLog'
import type { TurnResult } from '../../../main/turnIpc'
import { getShowRolls, setShowRolls } from './rollVisibilityPreference'
import { useSessionRecap, type SessionRecapController } from './useSessionRecap'

export interface PlayViewController {
  log: PlayLogEntry[]
  inputValue: string
  setInputValue: (value: string) => void
  submitting: boolean
  submitAction: () => Promise<void>
  showRolls: boolean
  toggleShowRolls: () => void
  lastCheck: TurnResult['check'] | null
  sheetOpen: boolean
  toggleSheet: () => void
  closeSheet: () => void
  recap: SessionRecapController
}

export function usePlayViewController(campaignId: string, characterId: string): PlayViewController {
  const [log, setLog] = useState<PlayLogEntry[]>([])
  const [inputValue, setInputValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showRolls, setShowRollsState] = useState(() => getShowRolls(window.localStorage))
  const [lastCheck, setLastCheck] = useState<TurnResult['check'] | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const recap = useSessionRecap(campaignId)

  useEffect(() => {
    void window.campaigns.getNarrationLog(campaignId).then((entries) => {
      setLog(entries)
      if (entries.length > 0) {
        recap.show()
      }
    })
  }, [campaignId])

  function toggleShowRolls(): void {
    const next = !showRolls
    setShowRollsState(next)
    setShowRolls(window.localStorage, next)
  }

  async function submitAction(): Promise<void> {
    if (!inputValue.trim() || submitting) {
      return
    }
    setSubmitting(true)
    try {
      const result = await window.turn.resolve({ campaignId, characterId, playerInput: inputValue })
      setInputValue('')
      setLastCheck(result.check ?? null)
      setLog(await window.campaigns.getNarrationLog(campaignId))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    log,
    inputValue,
    setInputValue,
    submitting,
    submitAction,
    showRolls,
    toggleShowRolls,
    lastCheck,
    sheetOpen,
    toggleSheet: () => setSheetOpen((open) => !open),
    closeSheet: () => setSheetOpen(false),
    recap
  }
}
