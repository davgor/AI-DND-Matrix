export type StartupPhase = 'idle' | 'booting' | 'waitingDb' | 'waitingLlm' | 'ready' | 'failed'

export type BootStageId = 'db' | 'llm'

export const BOOT_STAGE_ORDER: readonly BootStageId[] = ['db', 'llm']
export const BOOT_STAGE_TOTAL = BOOT_STAGE_ORDER.length

export type BootErrorCategory = 'db' | 'runtime' | 'config' | 'unknown'

export interface StartupProgressPayload {
  phase: StartupPhase
  stageIndex: number
  stageTotal: number
  stage: BootStageId | null
  statusText: string
  progress: number
}

export interface StartupFailurePayload {
  phase: 'failed'
  category: BootErrorCategory
  message: string
  recoverable: boolean
}

export type StartupEventPayload = StartupProgressPayload | StartupFailurePayload

/** Readiness gates each boot stage must satisfy before the app shell is interactive. */
export const STARTUP_READINESS_GATES = {
  db: 'SQLite database opened and migrations applied successfully',
  llm: 'Selected LLM provider runtime is configured and reachable'
} as const
