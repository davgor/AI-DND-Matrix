export type AutoUpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface AutoUpdateState {
  phase: AutoUpdatePhase
  currentVersion: string
  availableVersion?: string
  downloadPercent?: number
  message?: string
}

export type ManualUpdateCheckResult =
  | { outcome: 'update-available'; version: string }
  | { outcome: 'up-to-date' }
  | { outcome: 'disabled' }
  | { outcome: 'busy'; message?: string }
  | { outcome: 'error'; message: string }

export const AUTO_UPDATE_EVENT_CHANNEL = 'autoUpdate:event'
