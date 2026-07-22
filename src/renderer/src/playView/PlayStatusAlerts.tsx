import { useEffect, useState } from 'react'
import type { PendingAlignmentShift } from '../../../shared/alignment/types'
import {
  AlignmentShiftWarningBanner,
  DefeatDispositionBanner,
  ImprisonedStatusBanner,
  LockoutStatusBanner,
  LootRewardBanner,
  SpellGrantBanner,
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
  lockoutNarration: string | null
  spellGrantNarration: string | null
}

function pushIfPresent(
  alerts: PlayStatusAlertItem[],
  id: string,
  transient: boolean,
  node: JSX.Element | null
): void {
  if (node) {
    alerts.push({ id, transient, node })
  }
}

function pushTransientIfShown(input: {
  alerts: PlayStatusAlertItem[]
  id: string
  narration: string | null
  dismissed: Set<string>
  node: JSX.Element
}): void {
  if (input.narration && !input.dismissed.has(input.id)) {
    input.alerts.push({ id: input.id, transient: true, node: input.node })
  }
}

function pushPersistentPlayStatusAlerts(
  alerts: PlayStatusAlertItem[],
  props: PlayStatusAlertsProps
): void {
  pushIfPresent(
    alerts,
    'alignment',
    false,
    props.pendingAlignmentShift ? (
      <AlignmentShiftWarningBanner
        pending={props.pendingAlignmentShift}
        playerAlignment={props.playerAlignment}
      />
    ) : null
  )
  pushIfPresent(
    alerts,
    'imprisoned',
    false,
    props.playerImprisoned ? <ImprisonedStatusBanner /> : null
  )
  pushIfPresent(
    alerts,
    'defeat',
    false,
    props.defeatDispositionNarration ? (
      <DefeatDispositionBanner narrationText={props.defeatDispositionNarration} />
    ) : null
  )
}

function pushTransientPlayStatusAlerts(
  alerts: PlayStatusAlertItem[],
  props: PlayStatusAlertsProps,
  dismissed: Set<string>
): void {
  pushTransientIfShown({
    alerts,
    id: 'lockout',
    narration: props.lockoutNarration,
    dismissed,
    node: <LockoutStatusBanner narrationText={props.lockoutNarration ?? ''} />
  })
  pushTransientIfShown({
    alerts,
    id: 'spellGrant',
    narration: props.spellGrantNarration,
    dismissed,
    node: <SpellGrantBanner narrationText={props.spellGrantNarration ?? ''} />
  })
  pushTransientIfShown({
    alerts,
    id: 'xp',
    narration: props.xpNarration,
    dismissed,
    node: <XpRewardBanner narrationText={props.xpNarration ?? ''} />
  })
  pushTransientIfShown({
    alerts,
    id: 'loot',
    narration: props.lootNarration,
    dismissed,
    node: <LootRewardBanner narrationText={props.lootNarration ?? ''} />
  })
}

export function buildPlayStatusAlerts(
  props: PlayStatusAlertsProps,
  dismissed: Set<string>
): PlayStatusAlertItem[] {
  const alerts: PlayStatusAlertItem[] = []
  pushPersistentPlayStatusAlerts(alerts, props)
  pushTransientPlayStatusAlerts(alerts, props, dismissed)
  return alerts
}

function useTransientDismiss(
  value: string | null,
  id: string,
  setDismissed: (updater: (current: Set<string>) => Set<string>) => void
): void {
  useEffect(() => {
    if (!value) {
      return
    }
    const timer = window.setTimeout(() => {
      setDismissed((current) => new Set(current).add(id))
    }, TRANSIENT_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [value, id, setDismissed])
}

export function PlayStatusAlerts(props: PlayStatusAlertsProps): JSX.Element | null {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const [expanded, setExpanded] = useState(false)
  const alerts = buildPlayStatusAlerts(props, dismissed)

  useTransientDismiss(props.xpNarration, 'xp', setDismissed)
  useTransientDismiss(props.lootNarration, 'loot', setDismissed)
  useTransientDismiss(props.lockoutNarration, 'lockout', setDismissed)
  useTransientDismiss(props.spellGrantNarration, 'spellGrant', setDismissed)

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
