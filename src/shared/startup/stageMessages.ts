import type { BootStageId, StartupPhase } from './types'

export function mapStageToPlayerMessage(
  stage: BootStageId | null,
  phase: StartupPhase,
  statusText: string
): string {
  if (phase === 'ready') {
    return 'Ready to adventure'
  }
  if (phase === 'failed') {
    return statusText
  }
  if (stage === 'db') {
    return 'Loading campaign database'
  }
  if (stage === 'llm') {
    return 'Booting narrative engine'
  }
  return statusText
}

export function progressForStage(stageIndex: number, stageTotal: number): number {
  if (stageTotal <= 0) {
    return 0
  }
  const clampedIndex = Math.max(0, Math.min(stageIndex, stageTotal))
  return Math.round((clampedIndex / stageTotal) * 100)
}
