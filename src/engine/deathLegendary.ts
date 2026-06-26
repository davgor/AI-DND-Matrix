import type { DyingState } from './dying'

export interface LegendaryDeathResult {
  permanentlyDead: true
}

export function resolveLegendaryDeath(dyingState: DyingState): LegendaryDeathResult {
  if (!dyingState.lost) {
    throw new Error('legendary death resolution requires a lost dying sequence')
  }
  return { permanentlyDead: true }
}
