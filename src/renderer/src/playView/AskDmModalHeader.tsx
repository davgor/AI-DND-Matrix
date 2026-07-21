export function AskDmModalHeader(props: { onClose: () => void }): JSX.Element {
  return (
    <header className="ask-dm-header">
      <div>
        <p className="eyebrow">Out of character</p>
        <h2 id="ask-dm-title">Ask the DM</h2>
      </div>
      <button
        type="button"
        className="character-log-book-close"
        aria-label="Close Ask the DM"
        onClick={props.onClose}
      >
        ×
      </button>
    </header>
  )
}
