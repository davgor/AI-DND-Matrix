import { describe, expect, it } from 'vitest'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'

function transitionExposition(current: ExpositionStatus, event: 'submit' | 'success' | 'failure'): ExpositionStatus {
  if (event === 'submit') {
    return { state: 'loading', errorMessage: null }
  }
  if (event === 'success') {
    return { state: 'idle', errorMessage: null }
  }
  return { state: 'error', errorMessage: 'Could not update the scene.' }
}

describe('exposition update flow', () => {
  it('moves through loading to idle on success', () => {
    const idle: ExpositionStatus = { state: 'idle', errorMessage: null }
    const loading = transitionExposition(idle, 'submit')
    expect(loading.state).toBe('loading')
    expect(transitionExposition(loading, 'success').state).toBe('idle')
  })

  it('surfaces actionable error without staying in loading', () => {
    const loading: ExpositionStatus = { state: 'loading', errorMessage: null }
    const failed = transitionExposition(loading, 'failure')
    expect(failed.state).toBe('error')
    expect(failed.errorMessage).toBeTruthy()
  })
})
