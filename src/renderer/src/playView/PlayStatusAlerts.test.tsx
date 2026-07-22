import { describe, expect, it } from 'vitest'
import { buildPlayStatusAlerts } from './PlayStatusAlerts'
import { ImprisonedStatusBanner, LockoutStatusBanner, SpellGrantBanner, XpRewardBanner } from './dmExpositionParts'

const emptyAlerts = {
  pendingAlignmentShift: null,
  playerAlignment: null,
  playerImprisoned: false,
  defeatDispositionNarration: null,
  xpNarration: null,
  lootNarration: null,
  lockoutNarration: null,
  spellGrantNarration: null,
  commerceTravelFeedback: null
} as const

describe('PlayStatusAlerts', () => {
  it('renders imprisoned and xp alerts with accessible roles', () => {
    expect(ImprisonedStatusBanner().props.role).toBe('status')
    expect(XpRewardBanner({ narrationText: 'You gain 50 experience.' }).props.role).toBe('status')

    const alerts = buildPlayStatusAlerts(
      {
        ...emptyAlerts,
        playerImprisoned: true,
        xpNarration: 'You gain 50 experience.'
      },
      new Set()
    )

    expect(alerts).toHaveLength(2)
    expect(alerts[0]?.id).toBe('imprisoned')
    expect(alerts[1]?.id).toBe('xp')
  })

  it('surfaces lockout and spell grant banners', () => {
    expect(LockoutStatusBanner({ narrationText: 'Locked' }).props.role).toBe('status')
    expect(SpellGrantBanner({ narrationText: 'Learned Firebolt' }).props.role).toBe('status')
    const alerts = buildPlayStatusAlerts(
      {
        ...emptyAlerts,
        lockoutNarration: 'You are recovering.',
        spellGrantNarration: 'You learned Firebolt.'
      },
      new Set()
    )
    expect(alerts.map((alert) => alert.id)).toEqual(['lockout', 'spellGrant'])
  })

  it('returns empty list when no alerts are active', () => {
    expect(buildPlayStatusAlerts({ ...emptyAlerts }, new Set())).toEqual([])
  })
})
