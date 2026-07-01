import { describe, expect, it } from 'vitest'
import { buildPlayStatusAlerts } from './PlayStatusAlerts'
import { ImprisonedStatusBanner, XpRewardBanner } from './dmExpositionParts'

describe('PlayStatusAlerts', () => {
  it('renders imprisoned and xp alerts with accessible roles', () => {
    expect(ImprisonedStatusBanner().props.role).toBe('status')
    expect(XpRewardBanner({ narrationText: 'You gain 50 experience.' }).props.role).toBe('status')

    const alerts = buildPlayStatusAlerts(
      {
        pendingAlignmentShift: null,
        playerAlignment: null,
        playerImprisoned: true,
        defeatDispositionNarration: null,
        xpNarration: 'You gain 50 experience.',
        lootNarration: null
      },
      new Set()
    )

    expect(alerts).toHaveLength(2)
    expect(alerts[0]?.id).toBe('imprisoned')
    expect(alerts[1]?.id).toBe('xp')
  })

  it('returns empty list when no alerts are active', () => {
    const alerts = buildPlayStatusAlerts(
      {
        pendingAlignmentShift: null,
        playerAlignment: null,
        playerImprisoned: false,
        defeatDispositionNarration: null,
        xpNarration: null,
        lootNarration: null
      },
      new Set()
    )
    expect(alerts).toEqual([])
  })
})
