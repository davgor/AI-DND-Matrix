import { isRendererDevBuild } from '../dev/isRendererDevBuild'
import './fieldRandomDice.css'

function DiceIcon(): JSX.Element {
  return (
    <svg className="field-random-dice-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="8" cy="8" r="1.35" fill="currentColor" />
      <circle cx="16" cy="8" r="1.35" fill="currentColor" />
      <circle cx="8" cy="16" r="1.35" fill="currentColor" />
      <circle cx="16" cy="16" r="1.35" fill="currentColor" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
    </svg>
  )
}

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
      <DiceIcon />
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
