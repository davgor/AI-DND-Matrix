import type { GuidedCreationPhase } from '../../../shared/guidedCreation/types'

/** Once opening-scene negotiation marks the character complete, enter play. */
export function shouldAutoEnterWorld(phase: GuidedCreationPhase): boolean {
  return phase === 'complete'
}
