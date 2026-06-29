import type { ConnectionCheckResult, SettingsValidationError } from '../../../shared/settings/types'

export interface Player2SectionProps {
  player2BaseUrl: string
  errors: SettingsValidationError[]
  result: ConnectionCheckResult | null
  onChange: (baseUrl: string) => void
  onTestConnection: () => Promise<void>
}

export function Player2Section(props: Player2SectionProps): JSX.Element {
  const baseUrlError = props.errors.find((error) => error.field === 'player2BaseUrl')?.message

  return (
    <section className="settings-section" aria-label="Player2 endpoint">
      <h3>Player2 endpoint</h3>
      <label htmlFor="settings-player2-base-url">Base URL</label>
      <input
        id="settings-player2-base-url"
        type="text"
        placeholder="http://127.0.0.1:4315"
        value={props.player2BaseUrl}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {baseUrlError && <p className="settings-field-error">{baseUrlError}</p>}
      <button type="button" onClick={() => void props.onTestConnection()}>
        Test connection
      </button>
      {props.result && (
        <p className={props.result.ok ? 'settings-check-ok' : 'settings-check-failed'}>{props.result.message}</p>
      )}
    </section>
  )
}
