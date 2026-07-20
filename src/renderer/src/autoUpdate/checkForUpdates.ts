import type { ManualUpdateCheckResult } from '../../../shared/autoUpdate/types'

export function requestCheckForUpdates(
  checkForUpdates: () => Promise<ManualUpdateCheckResult>
): Promise<ManualUpdateCheckResult> {
  return checkForUpdates()
}
