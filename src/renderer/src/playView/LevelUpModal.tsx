import { useCallback, useEffect, useState } from 'react'
import type { PendingLevelUpResponse } from '../../../main/progressionIpc'
import { LevelUpModalBody } from './LevelUpModalBody'
import './levelUpModal.css'

export interface LevelUpModalProps {
  characterId: string
  refreshToken: number
  onComplete: () => void
}

export function LevelUpModal(props: LevelUpModalProps): JSX.Element | null {
  const [pending, setPending] = useState<PendingLevelUpResponse | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    setPending(await window.progression.getPendingLevelUp(props.characterId))
    setSelectedId(null)
  }, [props.characterId])

  useEffect(() => {
    void refresh()
  }, [refresh, props.refreshToken])

  if (!pending) {
    return null
  }

  async function confirmChoice(): Promise<void> {
    if (!selectedId || submitting) return
    setSubmitting(true)
    try {
      await window.progression.submitPerkChoice(props.characterId, selectedId)
      await refresh()
      props.onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="level-up-overlay" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
      <LevelUpModalBody
        pending={pending}
        selectedId={selectedId}
        submitting={submitting}
        onSelect={setSelectedId}
        onConfirm={() => void confirmChoice()}
      />
    </div>
  )
}

export function useLevelUpPoll(characterId: string, refreshToken: number): boolean {
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    let active = true
    void window.progression.getPendingLevelUp(characterId).then((next) => {
      if (active) setBlocked(next !== null)
    })
    return () => {
      active = false
    }
  }, [characterId, refreshToken])
  return blocked
}
