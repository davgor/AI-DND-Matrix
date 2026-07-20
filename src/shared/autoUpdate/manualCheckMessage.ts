import type { ManualUpdateCheckResult } from './types'

export const CHECKING_UPDATES_MESSAGE = 'Checking for updates…'

export function formatManualUpdateCheckMessage(result: ManualUpdateCheckResult): string {
  if (result.outcome === 'update-available') {
    return `Update found: v${result.version}`
  }
  if (result.outcome === 'up-to-date') {
    return "No updates found — you're on the latest version."
  }
  if (result.outcome === 'disabled') {
    return 'Update checks are only available in installed builds.'
  }
  if (result.outcome === 'busy') {
    return result.message ?? 'An update check is already in progress.'
  }
  return `Update check failed: ${result.message}`
}

export function statusToneForResult(
  result: ManualUpdateCheckResult
): 'ok' | 'failed' | 'pending' {
  if (result.outcome === 'error') {
    return 'failed'
  }
  if (result.outcome === 'disabled' || result.outcome === 'busy') {
    return 'pending'
  }
  return 'ok'
}
