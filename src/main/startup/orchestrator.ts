import {
  BOOT_STAGE_TOTAL,
  type BootStageId,
  type StartupFailurePayload,
  type StartupPhase,
  type StartupProgressPayload
} from '../../shared/startup/types'
import { assertStartupTransition } from '../../shared/startup/transitions'
import { progressForStage } from '../../shared/startup/stageMessages'
import type { BootStage, BootStageResult } from './bootStages'

function phaseForStage(stageId: BootStageId): StartupPhase {
  return stageId === 'db' ? 'waitingDb' : 'waitingLlm'
}

export interface StartupOrchestratorOptions {
  stages: BootStage[]
  onEvent: (payload: StartupProgressPayload | StartupFailurePayload) => void
}

export class StartupOrchestrator {
  private phase: StartupPhase = 'idle'
  private booting = false
  private handoffComplete = false
  private lastProgress: StartupProgressPayload | null = null
  private lastFailure: StartupFailurePayload | null = null

  constructor(private readonly options: StartupOrchestratorOptions) {}

  getPhase(): StartupPhase {
    return this.phase
  }

  hasHandedOff(): boolean {
    return this.handoffComplete
  }

  getLastProgress(): StartupProgressPayload | null {
    return this.lastProgress
  }

  getLastFailure(): StartupFailurePayload | null {
    return this.lastFailure
  }

  getProgressPayload(
    stage: BootStageId | null,
    stageIndex: number,
    statusText: string
  ): StartupProgressPayload {
    return {
      phase: this.phase,
      stageIndex,
      stageTotal: BOOT_STAGE_TOTAL,
      stage,
      statusText,
      progress: progressForStage(stageIndex, BOOT_STAGE_TOTAL)
    }
  }

  private transition(to: StartupPhase): void {
    assertStartupTransition(this.phase, to)
    this.phase = to
  }

  private emitProgress(stage: BootStageId | null, stageIndex: number, statusText: string): void {
    const payload = this.getProgressPayload(stage, stageIndex, statusText)
    this.lastProgress = payload
    this.options.onEvent(payload)
  }

  private emitFailure(result: Extract<BootStageResult, { ok: false }>): void {
    this.transition('failed')
    const payload: StartupFailurePayload = {
      phase: 'failed',
      category: result.category,
      message: result.message,
      recoverable: result.recoverable
    }
    this.lastFailure = payload
    this.options.onEvent(payload)
  }

  async start(): Promise<boolean> {
    if (this.phase === 'ready') {
      return true
    }
    if (this.booting) {
      return false
    }
    this.lastFailure = null
    this.booting = true
    try {
      this.transition('booting')
      this.emitProgress(null, 0, 'Starting up')
      let stageIndex = 0
      for (const stage of this.options.stages) {
        this.transition(phaseForStage(stage.id))
        this.emitProgress(stage.id, stageIndex, stage.statusText)
        const result = await stage.run((text) => {
          this.emitProgress(stage.id, stageIndex, text)
        })
        if (!result.ok) {
          this.emitFailure(result)
          return false
        }
        stageIndex += 1
        this.emitProgress(stage.id, stageIndex, `${stage.statusText} — complete`)
      }
      this.transition('ready')
      this.handoffComplete = true
      this.emitProgress(null, BOOT_STAGE_TOTAL, 'Ready')
      return true
    } finally {
      this.booting = false
    }
  }

  async retry(): Promise<boolean> {
    if (this.phase !== 'failed') {
      return this.phase === 'ready'
    }
    this.phase = 'idle'
    return this.start()
  }
}
