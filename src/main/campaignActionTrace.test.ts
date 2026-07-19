import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CAMPAIGN_ACTION_TRACE_PREFIX,
  createCampaignActionTurnId,
  truncateTraceText
} from '../shared/debug/campaignActionTrace'
import {
  logCampaignAction,
  runWithCampaignActionTrace,
  setCampaignActionTraceEnabledForTests
} from './campaignActionTrace'

describe('campaignActionTrace helpers', () => {
  it('createCampaignActionTurnId returns unique turn_* ids', () => {
    const a = createCampaignActionTurnId()
    const b = createCampaignActionTurnId()
    expect(a).toMatch(/^turn_[a-z0-9]+_[a-z0-9]+$/i)
    expect(b).toMatch(/^turn_[a-z0-9]+_[a-z0-9]+$/i)
    expect(a).not.toBe(b)
  })

  it('truncateTraceText collapses whitespace and caps length', () => {
    expect(truncateTraceText('  hello   world  ')).toBe('hello world')
    const long = 'x'.repeat(200)
    const truncated = truncateTraceText(long, 40)
    expect(truncated.length).toBe(40)
    expect(truncated.endsWith('…')).toBe(true)
  })
})

describe('logCampaignAction gating', () => {
  beforeEach(() => {
    setCampaignActionTraceEnabledForTests(true)
  })

  afterEach(() => {
    setCampaignActionTraceEnabledForTests(undefined)
    vi.restoreAllMocks()
  })

  it('is a no-op when tracing is disabled', () => {
    setCampaignActionTraceEnabledForTests(false)
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    logCampaignAction('ipc_start', { campaignId: 'c1', playerInput: 'hi' })
    expect(debug).not.toHaveBeenCalled()
  })
})

describe('logCampaignAction emission', () => {
  beforeEach(() => {
    setCampaignActionTraceEnabledForTests(true)
  })

  afterEach(() => {
    setCampaignActionTraceEnabledForTests(undefined)
    vi.restoreAllMocks()
  })

  it('emits console.debug with prefix, phase, and truncated input under a turn context', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    await runWithCampaignActionTrace(
      {
        turnId: 'turn_test_1',
        campaignId: 'camp-1',
        characterId: 'char-1'
      },
      async () => {
        logCampaignAction('ipc_start', { playerInput: `say  ${'x'.repeat(200)}` })
      }
    )

    expect(debug).toHaveBeenCalledTimes(1)
    const [prefix, phase, payload] = debug.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>
    ]
    expect(prefix).toBe(CAMPAIGN_ACTION_TRACE_PREFIX)
    expect(phase).toBe('ipc_start')
    expect(payload.turnId).toBe('turn_test_1')
    expect(payload.campaignId).toBe('camp-1')
    expect(payload.characterId).toBe('char-1')
    expect(typeof payload.playerInput).toBe('string')
    expect(String(payload.playerInput).length).toBeLessThanOrEqual(160)
    expect(String(payload.playerInput).endsWith('…')).toBe(true)
  })
})

describe('logCampaignAction duration', () => {
  beforeEach(() => {
    setCampaignActionTraceEnabledForTests(true)
  })

  afterEach(() => {
    setCampaignActionTraceEnabledForTests(undefined)
    vi.restoreAllMocks()
  })

  it('includes durationMs on later phases inside the same turn context', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    await runWithCampaignActionTrace(
      {
        turnId: 'turn_test_2',
        campaignId: 'camp-2',
        characterId: 'char-2',
        startedAt: Date.now() - 25
      },
      async () => {
        logCampaignAction('complete', { branch: 'routed', beatCount: 2 })
      }
    )

    const payload = debug.mock.calls[0]?.[2] as Record<string, unknown>
    expect(payload.phase).toBe('complete')
    expect(payload.branch).toBe('routed')
    expect(payload.beatCount).toBe(2)
    expect(typeof payload.durationMs).toBe('number')
    expect(payload.durationMs as number).toBeGreaterThanOrEqual(20)
  })
})
