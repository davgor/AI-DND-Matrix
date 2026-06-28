import { useState } from 'react'
import type { DeathMode, RespawnRules } from '../../../db/repositories/campaigns'

export interface DeathModeState {
  deathMode: DeathMode
  respawnRules: RespawnRules | null
  setDeathMode: (mode: DeathMode, rules: RespawnRules | null) => void
}

export function useDeathModeState(): DeathModeState {
  const [deathMode, setDeathModeState] = useState<DeathMode>('legendary')
  const [respawnRules, setRespawnRules] = useState<RespawnRules | null>(null)

  function setDeathMode(mode: DeathMode, rules: RespawnRules | null): void {
    setDeathModeState(mode)
    setRespawnRules(rules)
  }

  return { deathMode, respawnRules, setDeathMode }
}
