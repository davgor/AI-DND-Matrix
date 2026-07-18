import { useEffect, useState } from 'react'
import { mapStageToPlayerMessage } from '../../../shared/startup/stageMessages'
import type {
  BootErrorCategory,
  StartupEventPayload,
  StartupPhase,
  StartupProgressPayload
} from '../../../shared/startup/types'

export interface StartupBootState {
  phase: StartupPhase
  progress: number
  stageLabel: string
  statusText: string
  failureCategory: BootErrorCategory | null
  failureMessage: string | null
  recoverable: boolean
  retrying: boolean
  retry: () => Promise<void>
}

function applyEvent(
  event: StartupEventPayload,
  setState: (updater: (prev: StartupBootState) => StartupBootState) => void
): void {
  if (event.phase === 'failed' && 'category' in event) {
    setState((prev) => ({
      ...prev,
      phase: 'failed',
      failureCategory: event.category,
      failureMessage: event.message,
      recoverable: event.recoverable,
      statusText: event.message,
      stageLabel: 'Startup failed'
    }))
    return
  }
  const progressEvent = event as StartupProgressPayload
  setState((prev) => ({
    ...prev,
    phase: progressEvent.phase,
    progress: progressEvent.progress,
    statusText: progressEvent.statusText,
    stageLabel: mapStageToPlayerMessage(
      progressEvent.stage,
      progressEvent.phase,
      progressEvent.statusText
    ),
    failureCategory: null,
    failureMessage: null,
    recoverable: false
  }))
}

const INITIAL: StartupBootState = {
  phase: 'idle',
  progress: 0,
  stageLabel: 'Preparing your adventure',
  statusText: 'Starting up',
  failureCategory: null,
  failureMessage: null,
  recoverable: false,
  retrying: false,
  retry: async () => undefined
}

export function useStartupBoot(): StartupBootState {
  const [state, setState] = useState<StartupBootState>(INITIAL)

  useEffect(() => {
    const unsubscribe = window.startup.onEvent((event) => applyEvent(event, setState))
    void window.startup.getState().then((snapshot) => applyEvent(snapshot, setState))
    return unsubscribe
  }, [])

  async function retry(): Promise<void> {
    setState((prev) => ({ ...prev, retrying: true }))
    try {
      await window.startup.retry()
    } finally {
      setState((prev) => ({ ...prev, retrying: false }))
    }
  }

  return { ...state, retry }
}
