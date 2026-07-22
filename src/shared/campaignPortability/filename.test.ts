import { describe, expect, it } from 'vitest'
import { formatCampaignPackageFilename, sanitizeCampaignFileStem } from './filename'
import { CAMPAIGN_PACKAGE_EXTENSION } from './types'

describe('campaign package filename', () => {
  it('sanitizes unsafe characters and appends date + extension', () => {
    expect(sanitizeCampaignFileStem('  My: Campaign*/ ')).toBe('My-Campaign')
    expect(formatCampaignPackageFilename('Dragon War', new Date('2026-07-21T12:00:00.000Z'))).toBe(
      `Dragon-War-2026-07-21${CAMPAIGN_PACKAGE_EXTENSION}`
    )
  })
})
