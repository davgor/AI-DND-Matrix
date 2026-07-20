import { describe, expect, it, vi } from 'vitest'
import type { AutoUpdateState } from '../../../shared/autoUpdate/types'
import {
  UpdateBannerView,
  formatAvailableCopy,
  formatDownloadingCopy
} from './UpdateBanner'

function state(patch: Partial<AutoUpdateState>): AutoUpdateState {
  return {
    phase: 'idle',
    currentVersion: '1.0.0',
    ...patch
  }
}

describe('formatAvailableCopy', () => {
  it('shows current → available when both versions are known', () => {
    expect(formatAvailableCopy('1.0.0', '1.1.0')).toBe('Update available: v1.0.0 → v1.1.0')
  })

  it('falls back when available version is missing', () => {
    expect(formatAvailableCopy('1.0.0', undefined)).toBe('Update available')
  })
})

describe('formatDownloadingCopy', () => {
  it('includes percent and available version when known', () => {
    expect(formatDownloadingCopy(42, '1.1.0')).toBe('Downloading v1.1.0… 42%')
  })

  it('omits percent when unknown', () => {
    expect(formatDownloadingCopy(undefined, '1.1.0')).toBe('Downloading v1.1.0…')
  })
})

describe('UpdateBannerView idle and checking', () => {
  it('returns null while idle', () => {
    expect(UpdateBannerView({ update: state({ phase: 'idle' }), onRestart: () => undefined })).toBeNull()
  })

  it('shows checking status', () => {
    const node = UpdateBannerView({
      update: state({ phase: 'checking' }),
      onRestart: () => undefined
    })
    expect(node?.props.role).toBe('status')
    expect(node?.props.children.props.children).toBe('Checking for updates…')
  })
})

describe('UpdateBannerView available and downloading', () => {
  it('shows available from→to copy', () => {
    const node = UpdateBannerView({
      update: state({ phase: 'available', availableVersion: '1.1.0' }),
      onRestart: () => undefined
    })
    expect(node?.props.children.props.children).toBe('Update available: v1.0.0 → v1.1.0')
  })

  it('shows downloading progress bar', () => {
    const node = UpdateBannerView({
      update: state({ phase: 'downloading', availableVersion: '1.1.0', downloadPercent: 55 }),
      onRestart: () => undefined
    })
    const children = node?.props.children as JSX.Element[]
    expect(children[0]?.props.children).toBe('Downloading v1.1.0… 55%')
    expect(children[1]?.props.className).toBe('update-banner-progress')
    expect(children[1]?.props.children.props.style).toEqual({ width: '55%' })
  })
})

describe('UpdateBannerView ready and error', () => {
  it('shows ready CTA that calls onRestart', () => {
    const onRestart = vi.fn()
    const node = UpdateBannerView({
      update: state({
        phase: 'downloaded',
        availableVersion: '1.1.0',
        message: 'Restart and update'
      }),
      onRestart
    })
    expect(node?.props.className).toContain('update-banner-ready')
    const children = node?.props.children as JSX.Element[]
    expect(children[0]?.props.children).toBe('Restart and update')
    const button = children.find((child) => child?.type === 'button')
    expect(button?.props.children).toBe('Restart and update')
    button?.props.onClick()
    expect(onRestart).toHaveBeenCalledTimes(1)
  })

  it('shows error alert with message', () => {
    const node = UpdateBannerView({
      update: state({ phase: 'error', message: 'network down' }),
      onRestart: () => undefined
    })
    expect(node?.props.role).toBe('alert')
    expect(node?.props.className).toContain('update-banner-error')
    expect(node?.props.children.props.children).toBe('Update error: network down')
  })
})
