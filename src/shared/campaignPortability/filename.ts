import {
  CAMPAIGN_PACKAGE_EXTENSION,
  CAMPAIGN_PACKAGE_FILENAME_PREFIX
} from './types'

function isUnsafeFilenameChar(char: string): boolean {
  const code = char.charCodeAt(0)
  if (code < 32) return true
  return '<>:"/\\|?*'.includes(char)
}

/** Safe filesystem stem from a campaign name. */
export function sanitizeCampaignFileStem(name: string): string {
  const cleaned = [...name.trim()]
    .map((char) => (isUnsafeFilenameChar(char) ? '' : char))
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned.slice(0, 64) || CAMPAIGN_PACKAGE_FILENAME_PREFIX
}

export function formatCampaignPackageFilename(campaignName: string, now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10)
  return `${sanitizeCampaignFileStem(campaignName)}-${stamp}${CAMPAIGN_PACKAGE_EXTENSION}`
}
