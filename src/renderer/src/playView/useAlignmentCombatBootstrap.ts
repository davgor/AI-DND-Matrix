import { useEffect, useState } from 'react'
import type { CombatStateSnapshot } from '../../../shared/combat/types'
import type { Alignment, PendingAlignmentShift } from '../../../shared/alignment/types'
import { refreshPlayerAlignmentState } from './refreshPlayerAlignmentState'

export function useAlignmentCombatBootstrap(campaignId: string, characterId: string, characterRefreshToken: number) {
  const [pendingAlignmentShift, setPendingAlignmentShift] = useState<PendingAlignmentShift | null>(null)
  const [playerAlignment, setPlayerAlignment] = useState<Alignment | null>(null)
  const [combatState, setCombatState] = useState<CombatStateSnapshot | null>(null)

  useEffect(() => {
    void refreshPlayerAlignmentState(campaignId, characterId).then((state) => {
      setPendingAlignmentShift(state.pending)
      setPlayerAlignment(state.alignment)
    })
    void window.combat.getState(campaignId).then(setCombatState)
  }, [campaignId, characterId, characterRefreshToken])

  return {
    pendingAlignmentShift,
    setPendingAlignmentShift,
    playerAlignment,
    setPlayerAlignment,
    combatState,
    setCombatState
  }
}
