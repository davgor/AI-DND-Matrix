export function GenerateModalActions(props: {
  generating: boolean
  submitDisabled: boolean
  submitLabel: string
  generatingLabel: string
  onClose: () => void
  onSubmit: () => void
}): JSX.Element {
  return (
    <div className="campaign-review-generate-actions">
      <button type="button" disabled={props.generating} onClick={props.onClose}>
        Cancel
      </button>
      <button
        type="button"
        className="campaign-review-generate-submit"
        disabled={props.generating || props.submitDisabled}
        onClick={props.onSubmit}
      >
        {props.generating ? props.generatingLabel : props.submitLabel}
      </button>
    </div>
  )
}
