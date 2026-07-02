import type { ReactNode } from 'react'
import './proceedButton.css'

export interface ProceedButtonProps {
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}

export function ProceedButton(props: ProceedButtonProps): JSX.Element {
  return (
    <button type="button" className="onboarding-proceed" disabled={props.disabled} onClick={props.onClick}>
      <span>{props.children}</span>
      <span className="onboarding-proceed-arrow" aria-hidden="true">
        →
      </span>
    </button>
  )
}
