import { useState } from 'react'
import {
  CHECKING_UPDATES_MESSAGE,
  formatManualUpdateCheckMessage,
  statusToneForResult
} from '../../../shared/autoUpdate/manualCheckMessage'
import { requestCheckForUpdates } from './checkForUpdates'

type StatusTone = 'ok' | 'failed' | 'pending'

interface CheckForUpdatesButtonViewProps {
  disabled?: boolean
  label?: string
  checking: boolean
  statusMessage: string | null
  statusTone: StatusTone | null
  onCheck: () => void
}

function statusClassName(tone: StatusTone): string {
  if (tone === 'ok') {
    return 'settings-check-ok'
  }
  if (tone === 'failed') {
    return 'settings-check-failed'
  }
  return 'settings-check-pending'
}

export function CheckForUpdatesButtonView(props: CheckForUpdatesButtonViewProps): JSX.Element {
  const label = props.label ?? 'Check for updates'
  return (
    <div className="settings-check-updates-wrap">
      <button
        type="button"
        className="settings-check-updates"
        disabled={props.disabled || props.checking}
        onClick={props.onCheck}
      >
        {label}
      </button>
      {props.statusMessage && props.statusTone ? (
        <p className={statusClassName(props.statusTone)} role="status" aria-live="polite">
          {props.statusMessage}
        </p>
      ) : null}
    </div>
  )
}

interface CheckForUpdatesButtonProps {
  disabled?: boolean
  label?: string
}

export function CheckForUpdatesButton(props: CheckForUpdatesButtonProps): JSX.Element {
  const [checking, setChecking] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<StatusTone | null>(null)

  const onCheck = (): void => {
    setChecking(true)
    setStatusMessage(CHECKING_UPDATES_MESSAGE)
    setStatusTone('pending')
    void requestCheckForUpdates(() => window.autoUpdate.checkForUpdates())
      .then((result) => {
        setStatusMessage(formatManualUpdateCheckMessage(result))
        setStatusTone(statusToneForResult(result))
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Update check failed'
        setStatusMessage(formatManualUpdateCheckMessage({ outcome: 'error', message }))
        setStatusTone('failed')
      })
      .finally(() => {
        setChecking(false)
      })
  }

  return (
    <CheckForUpdatesButtonView
      disabled={props.disabled}
      label={props.label}
      checking={checking}
      statusMessage={statusMessage}
      statusTone={statusTone}
      onCheck={onCheck}
    />
  )
}
