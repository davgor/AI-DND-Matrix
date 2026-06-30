import { isRendererDevBuild } from '../dev/isRendererDevBuild'
import './fieldRandomDice.css'

export function FieldRandomDiceButton(props: {
  ariaLabel: string
  disabled?: boolean
  onRandomize: () => void
}): JSX.Element | null {
  if (!isRendererDevBuild()) {
    return null
  }

  return (
    <button
      type="button"
      className="field-random-dice"
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      onClick={props.onRandomize}
    >
      🎲
    </button>
  )
}

export function FieldWithRandomInputRow(props: {
  ariaLabel: string
  disabled?: boolean
  centerAlign?: boolean
  onRandomize: () => void
  children: JSX.Element
}): JSX.Element {
  const rowClass = props.centerAlign
    ? 'field-with-random-input-row field-with-random-input-row--center'
    : 'field-with-random-input-row'

  return (
    <div className={rowClass}>
      {props.children}
      <FieldRandomDiceButton
        ariaLabel={props.ariaLabel}
        disabled={props.disabled}
        onRandomize={props.onRandomize}
      />
    </div>
  )
}
