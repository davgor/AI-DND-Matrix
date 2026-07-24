export function SettingsIntroAskImage(props: {
  onYes: () => void
  onNo: () => void
}): JSX.Element {
  return (
    <>
      <h2 id="settings-intro-title">Set up local image generation?</h2>
      <p className="settings-intro-lead">
        Your local LLM is ready. You can optionally download a local image model (sd-server) for
        generative portraits, or configure cloud / Player2 painting later in Settings.
      </p>
      <footer className="settings-intro-actions">
        <button type="button" onClick={props.onNo}>
          Not now
        </button>
        <button type="button" className="settings-intro-primary" onClick={props.onYes}>
          Yes, set up images
        </button>
      </footer>
    </>
  )
}
