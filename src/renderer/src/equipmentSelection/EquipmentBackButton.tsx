export function EquipmentBackButton(props: { onBack: () => void }): JSX.Element {
  return (
    <button type="button" className="equipment-selection-back" onClick={props.onBack}>
      <span className="equipment-selection-back-arrow" aria-hidden="true">
        ←
      </span>
      <span>Back</span>
    </button>
  )
}
