import type { StartupBootState } from './useStartupBoot'
import { APP_DISPLAY_NAME } from '../../../shared/appBranding'
import './loadingScreen.css'

export interface LoadingScreenProps {
  boot: StartupBootState
}

function failureHint(category: StartupBootState['failureCategory']): string {
  switch (category) {
    case 'db':
      return 'The campaign database could not be opened. Free disk space or fix permissions, then retry.'
    case 'runtime':
      return 'The narrative engine is not running. Start your local runtime or check .env settings, then retry.'
    case 'config':
      return 'Configuration is incomplete. Update your .env file with the required provider settings.'
    default:
      return 'An unexpected startup error occurred. Retry or restart the app.'
  }
}

export function LoadingScreen(props: LoadingScreenProps): JSX.Element {
  const { boot } = props
  const failed = boot.phase === 'failed'

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-screen-panel">
        <p className="loading-screen-eyebrow">{APP_DISPLAY_NAME}</p>
        <h1 className="loading-screen-title">{failed ? 'Startup Interrupted' : boot.stageLabel}</h1>
        <p className="loading-screen-status">{boot.statusText}</p>
        {!failed ? (
          <div className="loading-screen-progress-track" aria-hidden="true">
            <div className="loading-screen-progress-fill" style={{ width: `${boot.progress}%` }} />
          </div>
        ) : (
          <div className="loading-screen-failure">
            <p className="loading-screen-failure-hint">{failureHint(boot.failureCategory)}</p>
            {boot.recoverable ? (
              <button
                type="button"
                className="loading-screen-retry"
                onClick={() => void boot.retry()}
                disabled={boot.retrying}
              >
                {boot.retrying ? 'Retrying…' : 'Retry'}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
