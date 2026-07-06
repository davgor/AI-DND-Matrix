export function BackgroundBackButton(props: { onBack: () => void }): JSX.Element {
  return (
    <button type="button" className="background-selection-back" onClick={props.onBack}>
      <span className="background-selection-back-arrow" aria-hidden="true">
        ←
      </span>
      <span>Back</span>
    </button>
  )
}
