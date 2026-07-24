export function SettingsIntroSetupProgress(props: {
  progressText: string | null
  progressPercent: number | null
  error: string | null
  onRetry: () => void
  onSkip: () => void
}): JSX.Element {
  return (
    <>
      <h2 id="settings-intro-title">Setting up local LLM</h2>
      <p className="settings-intro-lead">
        Downloading the recommended model and acquiring the llama.cpp runtime. This can take a
        while on first run.
      </p>
      <div className="settings-intro-setup-progress" aria-live="polite">
        <progress
          className="settings-intro-setup-progress-bar"
          max={100}
          value={props.progressPercent == null ? undefined : props.progressPercent}
          aria-label="Local LLM setup progress"
        />
        {props.progressText ? <p className="settings-intro-lead">{props.progressText}</p> : null}
        {props.error ? <p className="settings-intro-error">{props.error}</p> : null}
      </div>
      {props.error ? (
        <footer className="settings-intro-actions">
          <button type="button" onClick={props.onSkip}>
            Skip for now
          </button>
          <button type="button" className="settings-intro-primary" onClick={props.onRetry}>
            Retry
          </button>
        </footer>
      ) : null}
    </>
  )
}
