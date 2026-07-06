export function WorldHistoryModalActions(props: {
  readOnly: boolean | undefined
  saving: boolean
  canSave: boolean
  onClose: () => void
  onSave: () => void
}): JSX.Element {
  return (
    <div className="campaign-review-generate-actions">
      <button type="button" disabled={props.saving} onClick={props.onClose}>
        Close
      </button>
      {!props.readOnly ? (
        <button
          type="button"
          className="campaign-review-generate-submit"
          disabled={props.saving || !props.canSave}
          onClick={props.onSave}
        >
          {props.saving ? 'Saving...' : 'Save'}
        </button>
      ) : null}
    </div>
  )
}
