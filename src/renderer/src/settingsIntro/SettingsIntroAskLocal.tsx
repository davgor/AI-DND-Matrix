export function SettingsIntroAskLocal(props: {
  onYes: () => void
  onNo: () => void
}): JSX.Element {
  return (
    <>
      <h2 id="settings-intro-title">Download a local LLM?</h2>
      <p className="settings-intro-lead">
        You can run a local model on this machine (no cloud API key). The app will download a
        recommended model and set up llama.cpp for you.
      </p>
      <footer className="settings-intro-actions">
        <button type="button" onClick={props.onNo}>
          No thanks
        </button>
        <button type="button" className="settings-intro-primary" onClick={props.onYes}>
          Yes, download local LLM
        </button>
      </footer>
    </>
  )
}
