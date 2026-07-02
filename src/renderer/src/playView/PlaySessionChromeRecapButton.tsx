export function PlaySessionChromeRecapButton(props: { onOpenRecap: () => void }): JSX.Element {
  return (
    <button type="button" className="play-session-chrome-recap-button" onClick={props.onOpenRecap}>
      Recap
    </button>
  )
}
