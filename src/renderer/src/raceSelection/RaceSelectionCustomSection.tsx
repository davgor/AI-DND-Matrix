import { RacePickButton } from './RaceSelectionParts'

export function RaceSelectionCustomSection(props: {
  selected: boolean
  onPickCustom: () => void
}): JSX.Element {
  return (
    <section className="race-selection-group">
      <h2>Custom</h2>
      <div className="race-selection-options">
        <RacePickButton
          label="Custom race ✎"
          selected={props.selected}
          onSelect={props.onPickCustom}
        />
      </div>
    </section>
  )
}
