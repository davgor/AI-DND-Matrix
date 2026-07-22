import { describe, expect, it } from 'vitest'
import { CommerceTravelBanner } from './dmExpositionParts'
import { buildPlayStatusAlerts } from './PlayStatusAlerts'

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

describe('commerceTravelFeedback UI (135.5)', () => {
  it('surfaces broke / unknown fail copy without requiring DM prose', () => {
    const broke = CommerceTravelBanner({ narrationText: 'You cannot afford Longsword.' })
    expect(broke.props.role).toBe('status')
    expect(broke.props.className).toMatch(/fail/)

    const unknown = CommerceTravelBanner({
      narrationText: 'No known item matches "vorpal blade".'
    })
    expect(unknown.props.className).toMatch(/fail/)

    const alerts = buildPlayStatusAlerts(
      {
        ...emptyAlerts,
        commerceTravelFeedback: 'You cannot afford Longsword.'
      },
      new Set()
    )
    expect(alerts.map((alert) => alert.id)).toEqual(['commerceTravel'])
  })

  it('surfaces success copy independently of DM narration', () => {
    const success = CommerceTravelBanner({
      narrationText: 'Bought Dagger for 15 gold. Balance: 85.'
    })
    expect(success.props.role).toBe('status')
    expect(success.props.className).not.toMatch(/fail/)
  })
})
