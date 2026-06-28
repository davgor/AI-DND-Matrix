import type { StartupPhase } from './types'

const ALLOWED_TRANSITIONS: Record<StartupPhase, readonly StartupPhase[]> = {
  idle: ['booting'],
  booting: ['waitingDb', 'failed'],
  waitingDb: ['waitingLlm', 'failed'],
  waitingLlm: ['ready', 'failed'],
  ready: [],
  failed: ['booting']
}

export function canStartupTransition(from: StartupPhase, to: StartupPhase): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function assertStartupTransition(from: StartupPhase, to: StartupPhase): void {
  if (!canStartupTransition(from, to)) {
    throw new Error(`Illegal startup transition: ${from} -> ${to}`)
  }
}
