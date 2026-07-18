import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import { failedExposition } from './submitPlayerTurn'

export function failedTurnSubmission(characterRefreshToken: number): {
  expositionStatus: ExpositionStatus
  lastCheck: null
  characterRefreshToken: number
  pendingAlignmentShift: null
  playerAlignment: null
  combatState: null
  fleeOutcome: null
  defeatDispositionNarration: null
  xpNarration: null
  lootNarration: null
  playerImprisoned: false
  dyingResolution?: undefined
} {
  return {
    expositionStatus: failedExposition('Could not update the scene. Check your connection and try again.'),
    lastCheck: null,
    characterRefreshToken,
    pendingAlignmentShift: null,
    playerAlignment: null,
    combatState: null,
    fleeOutcome: null,
    defeatDispositionNarration: null,
    xpNarration: null,
    lootNarration: null,
    playerImprisoned: false,
    dyingResolution: undefined
  }
}
