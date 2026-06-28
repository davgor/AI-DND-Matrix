import { useState } from 'react'
import { getShowRolls, setShowRolls } from './rollVisibilityPreference'

export interface RollVisibilityController {
  showRolls: boolean
  toggleShowRolls: () => void
}

export function useRollVisibility(): RollVisibilityController {
  const [showRolls, setShowRollsState] = useState(() => getShowRolls(window.localStorage))

  function toggleShowRolls(): void {
    const next = !showRolls
    setShowRollsState(next)
    setShowRolls(window.localStorage, next)
  }

  return { showRolls, toggleShowRolls }
}
