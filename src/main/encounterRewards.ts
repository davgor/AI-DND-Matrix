import type { CombatEncounter } from '../shared/combat/types'

export function encounterEligibleForRewards(encounter: CombatEncounter): boolean {
  return encounter.phase === 'resolved' && encounter.outcome === 'defeated'
}
