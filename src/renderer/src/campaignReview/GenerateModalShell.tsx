import type { ReactNode } from 'react'
import { GenerateModalActions } from './GenerateModalActions'

export function GenerateModalShell(props: {
  titleId: string
  title: string
  description: string
  generating: boolean
  generateError: string | null
  submitDisabled: boolean
  submitLabel: string
  generatingLabel: string
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
}): JSX.Element {
  return (
    <div
      className="campaign-review-generate-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={props.titleId}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !props.generating) {
          props.onClose()
        }
      }}
    >
      <h2 id={props.titleId}>{props.title}</h2>
      <p>{props.description}</p>
      {props.children}
      {props.generateError ? <p className="campaign-review-error">{props.generateError}</p> : null}
      <GenerateModalActions
        generating={props.generating}
        submitDisabled={props.submitDisabled}
        submitLabel={props.submitLabel}
        generatingLabel={props.generatingLabel}
        onClose={props.onClose}
        onSubmit={props.onSubmit}
      />
    </div>
  )
}
