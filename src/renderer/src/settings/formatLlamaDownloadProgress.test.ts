import { describe, expect, it } from 'vitest'
import { formatLlamaDownloadProgress } from './formatLlamaDownloadProgress'

describe('formatLlamaDownloadProgress', () => {
  it('formats percent and bytes while downloading', () => {
    expect(
      formatLlamaDownloadProgress({
        phase: 'downloading',
        bytesReceived: 1_200_000_000,
        bytesTotal: 4_700_000_000,
        percent: 26
      })
    ).toBe('Downloading… 26% (1.12 GB / 4.38 GB)')
  })

  it('handles unknown total size', () => {
    expect(
      formatLlamaDownloadProgress({
        phase: 'downloading',
        bytesReceived: 50_000_000,
        bytesTotal: null,
        percent: null
      })
    ).toBe('Downloading… 48 MB received')
  })

  it('returns completion and failure messages', () => {
    expect(
      formatLlamaDownloadProgress({
        phase: 'complete',
        bytesReceived: 10,
        bytesTotal: 10,
        percent: 100
      })
    ).toBe('Download complete.')
    expect(
      formatLlamaDownloadProgress({
        phase: 'failed',
        bytesReceived: 0,
        bytesTotal: null,
        percent: null,
        errorMessage: 'Network error while downloading model: boom'
      })
    ).toBe('Network error while downloading model: boom')
  })
})
