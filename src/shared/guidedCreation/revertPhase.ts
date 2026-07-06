import type { GuidedCreationPhase } from './types'

export const ONBOARDING_CREATION_PHASES = ['race', 'background', 'equipment'] as const
export type RevertibleOnboardingPhase = (typeof ONBOARDING_CREATION_PHASES)[number]

const PHASE_ORDER: GuidedCreationPhase[] = [
  'none',
  'race',
  'background',
  'equipment',
  'identity',
  'opening_scene',
  'complete'
]

const REVERT_SOURCE_PHASES: GuidedCreationPhase[] = ['background', 'equipment']

export function canRevertGuidedCreationPhase(
  current: GuidedCreationPhase,
  target: RevertibleOnboardingPhase
): boolean {
  if (!REVERT_SOURCE_PHASES.includes(current)) {
    return false
  }
  const currentIndex = PHASE_ORDER.indexOf(current)
  const targetIndex = PHASE_ORDER.indexOf(target)
  return currentIndex > targetIndex && currentIndex !== -1 && targetIndex !== -1
}
