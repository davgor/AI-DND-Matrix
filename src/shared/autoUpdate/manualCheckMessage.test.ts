import { describe, expect, it } from 'vitest'
import {
  CHECKING_UPDATES_MESSAGE,
  formatManualUpdateCheckMessage,
  statusToneForResult
} from './manualCheckMessage'

describe('formatManualUpdateCheckMessage', () => {
  it('formats update-available with version', () => {
    expect(formatManualUpdateCheckMessage({ outcome: 'update-available', version: '1.4.0' })).toBe(
      'Update found: v1.4.0'
    )
  })

  it('formats up-to-date', () => {
    expect(formatManualUpdateCheckMessage({ outcome: 'up-to-date' })).toBe(
      "No updates found — you're on the latest version."
    )
  })

  it('formats disabled', () => {
    expect(formatManualUpdateCheckMessage({ outcome: 'disabled' })).toBe(
      'Update checks are only available in installed builds.'
    )
  })

  it('formats busy with optional detail message', () => {
    expect(formatManualUpdateCheckMessage({ outcome: 'busy' })).toBe(
      'An update check is already in progress.'
    )
    expect(
      formatManualUpdateCheckMessage({
        outcome: 'busy',
        message: 'An update is ready to install.'
      })
    ).toBe('An update is ready to install.')
  })

  it('formats error with message', () => {
    expect(formatManualUpdateCheckMessage({ outcome: 'error', message: 'network down' })).toBe(
      'Update check failed: network down'
    )
  })
})

describe('CHECKING_UPDATES_MESSAGE', () => {
  it('is a checking confirmation string', () => {
    expect(CHECKING_UPDATES_MESSAGE).toBe('Checking for updates…')
  })
})

describe('statusToneForResult', () => {
  it('maps outcomes to status tones', () => {
    expect(statusToneForResult({ outcome: 'up-to-date' })).toBe('ok')
    expect(statusToneForResult({ outcome: 'update-available', version: '1.0.0' })).toBe('ok')
    expect(statusToneForResult({ outcome: 'disabled' })).toBe('pending')
    expect(statusToneForResult({ outcome: 'busy' })).toBe('pending')
    expect(statusToneForResult({ outcome: 'error', message: 'x' })).toBe('failed')
  })
})
