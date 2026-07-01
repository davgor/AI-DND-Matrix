import { useEffect, useState } from 'react'
import type { PendingAlignmentShift } from '../../../shared/alignment/types'
import {
  AlignmentShiftWarningBanner,
  DefeatDispositionBanner,
  ImprisonedStatusBanner,
  LootRewardBanner,
  XpRewardBanner
} from './dmExpositionParts'

const TRANSIENT_DISMISS_MS = 8000

export interface PlayStatusAlertItem {
  id: string
  node: JSX.Element
  transient: boolean
}

export interface PlayStatusAlertsProps {
  pendingAlignmentShift: PendingAlignmentShift | null
  playerAlignment: string | null
  playerImprisoned: boolean
  defeatDispositionNarration: string | null
  xpNarration: string | null
  lootNarration: string | null
}

export function buildPlayStatusAlerts(
  props: PlayStatusAlertsProps,
  dismissed: Set<string>
): PlayStatusAlertItem[] {
  const alerts: PlayStatusAlertItem[] = []

  if (props.pendingAlignmentShift) {
    alerts.push({
      id: 'alignment',
      transient: false,
      node: (
        <AlignmentShiftWarningBanner
          pending={props.pendingAlignmentShift}
          playerAlignment={props.playerAlignment}
        />
      )
    })
  }
  if (props.playerImprisoned) {
    alerts.push({ id: 'imprisoned', transient: false, node: <ImprisonedStatusBanner /> })
  }
  if (props.defeatDispositionNarration) {
    alerts.push({
      id: 'defeat',
      transient: false,
      node: <DefeatDispositionBanner narrationText={props.defeatDispositionNarration} />
    })
  }
  if (props.xpNarration && !dismissed.has('xp')) {
    alerts.push({
      id: 'xp',
      transient: true,
      node: <XpRewardBanner narrationText={props.xpNarration} />
    })
  }
  if (props.lootNarration && !dismissed.has('loot')) {
    alerts.push({
      id: 'loot',
      transient: true,
      node: <LootRewardBanner narrationText={props.lootNarration} />
    })
  }

  return alerts
}

export function PlayStatusAlerts(props: PlayStatusAlertsProps): JSX.Element | null {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const [expanded, setExpanded] = useState(false)
  const alerts = buildPlayStatusAlerts(props, dismissed)

  useEffect(() => {
    if (!props.xpNarration) {
      return
    }
    const timer = window.setTimeout(() => {
      setDismissed((current) => new Set(current).add('xp'))
    }, TRANSIENT_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [props.xpNarration])

  useEffect(() => {
    if (!props.lootNarration) {
      return
    }
    const timer = window.setTimeout(() => {
      setDismissed((current) => new Set(current).add('loot'))
    }, TRANSIENT_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [props.lootNarration])

  useEffect(() => {
    setDismissed(new Set())
  }, [props.pendingAlignmentShift, props.playerImprisoned, props.defeatDispositionNarration])

  if (alerts.length === 0) {
    return null
  }

  const visible = expanded ? alerts : alerts.slice(0, 2)
  const hiddenCount = alerts.length - visible.length

  return (
    <div className="play-status-alerts" data-testid="play-status-alerts">
      {visible.map((alert) => (
        <div key={alert.id} className="play-status-alert-item">
          {alert.node}
        </div>
      ))}
      {hiddenCount > 0 ? (
        <button type="button" className="play-status-alerts-expander" onClick={() => setExpanded(true)}>
          {hiddenCount} more alert{hiddenCount === 1 ? '' : 's'}
        </button>
      ) : expanded && alerts.length > 2 ? (
        <button type="button" className="play-status-alerts-expander" onClick={() => setExpanded(false)}>
          Show fewer
        </button>
      ) : null}
    </div>
  )
}
