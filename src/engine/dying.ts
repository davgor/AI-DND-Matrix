export interface DyingState {
  unconscious: boolean
  successStreak: number
  failureStreak: number
  stabilized: boolean
  lost: boolean
}

export const DYING_STABILIZE_STREAK = 3
export const DYING_LOSS_STREAK = 3

export function startDyingSequence(): DyingState {
  return { unconscious: true, successStreak: 0, failureStreak: 0, stabilized: false, lost: false }
}

export function recordDyingSaveResult(state: DyingState, success: boolean): DyingState {
  if (state.stabilized || state.lost) {
    return state
  }

  if (success) {
    const successStreak = state.successStreak + 1
    return {
      ...state,
      successStreak,
      failureStreak: 0,
      stabilized: successStreak >= DYING_STABILIZE_STREAK
    }
  }

  const failureStreak = state.failureStreak + 1
  return {
    ...state,
    failureStreak,
    successStreak: 0,
    lost: failureStreak >= DYING_LOSS_STREAK
  }
}
