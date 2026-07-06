export function RaceBackButton(props: { onBack: () => void }): JSX.Element {
  return (
    <button type="button" className="race-selection-back" onClick={props.onBack}>
      <span className="race-selection-back-arrow" aria-hidden="true">
        ←
      </span>
      <span>Back</span>
    </button>
  )
}
