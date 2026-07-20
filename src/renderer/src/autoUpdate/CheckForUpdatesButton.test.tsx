import { describe, expect, it } from 'vitest'
import { CHECKING_UPDATES_MESSAGE } from '../../../shared/autoUpdate/manualCheckMessage'
import { CheckForUpdatesButtonView } from './CheckForUpdatesButton'

describe('CheckForUpdatesButtonView idle and checking', () => {
  it('renders the check control and no status by default', () => {
    const node = CheckForUpdatesButtonView({
      onCheck: () => undefined,
      checking: false,
      statusMessage: null,
      statusTone: null
    })
    const [button, status] = node.props.children as [JSX.Element, null]
    expect(button.props.children).toBe('Check for updates')
    expect(button.props.disabled).toBe(false)
    expect(status).toBeNull()
  })

  it('shows checking status and disables the button while checking', () => {
    const node = CheckForUpdatesButtonView({
      onCheck: () => undefined,
      checking: true,
      statusMessage: CHECKING_UPDATES_MESSAGE,
      statusTone: 'pending'
    })
    const [button, status] = node.props.children as [JSX.Element, JSX.Element]
    expect(button.props.disabled).toBe(true)
    expect(status.props.children).toBe(CHECKING_UPDATES_MESSAGE)
    expect(status.props.className).toContain('settings-check-pending')
  })
})

describe('CheckForUpdatesButtonView results', () => {
  it('shows result status with success tone for up-to-date', () => {
    const node = CheckForUpdatesButtonView({
      onCheck: () => undefined,
      checking: false,
      statusMessage: "No updates found — you're on the latest version.",
      statusTone: 'ok'
    })
    const [, status] = node.props.children as [JSX.Element, JSX.Element]
    expect(status.props.children).toBe("No updates found — you're on the latest version.")
    expect(status.props.className).toContain('settings-check-ok')
  })

  it('shows result status with ok tone for update found', () => {
    const node = CheckForUpdatesButtonView({
      onCheck: () => undefined,
      checking: false,
      statusMessage: 'Update found: v2.0.0',
      statusTone: 'ok'
    })
    const [, status] = node.props.children as [JSX.Element, JSX.Element]
    expect(status.props.children).toBe('Update found: v2.0.0')
    expect(status.props.className).toContain('settings-check-ok')
  })

  it('shows failed tone for errors', () => {
    const node = CheckForUpdatesButtonView({
      onCheck: () => undefined,
      checking: false,
      statusMessage: 'Update check failed: boom',
      statusTone: 'failed'
    })
    const [, status] = node.props.children as [JSX.Element, JSX.Element]
    expect(status.props.className).toContain('settings-check-failed')
  })
})
