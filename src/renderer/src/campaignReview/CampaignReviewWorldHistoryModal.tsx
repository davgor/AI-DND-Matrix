import { EditableFieldEditView } from './editableFieldViews'
import { WorldHistoryModalActions } from './WorldHistoryModalActions'
import { useWorldHistoryModalState } from './useWorldHistoryModalState'

function WorldHistoryModalBody(props: {
  readOnly: boolean | undefined
  value: string
  onChange: (value: string) => void
}): JSX.Element {
  if (props.readOnly) {
    return <div className="campaign-review-world-history-readonly">{props.value}</div>
  }
  return <EditableFieldEditView value={props.value} onChange={props.onChange} />
}

export function CampaignReviewWorldHistoryModal(props: {
  initialValue: string
  onSave: (value: string) => Promise<void>
  onClose: () => void
  readOnly?: boolean
}): JSX.Element {
  const modal = useWorldHistoryModalState(props.initialValue)

  return (
    <div className="campaign-review-overlay campaign-review-overlay--content-width">
      <div
        className="campaign-review-generate-modal campaign-review-world-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-review-world-history-title"
      >
        <h2 id="campaign-review-world-history-title">World history</h2>
        <p>
          The full one-pager hook for your setting — five rich paragraphs of past, legend, and recent epochs.
          Saving refreshes the summary on the review screen.
        </p>
        <div className="campaign-review-world-history-body">
          <WorldHistoryModalBody readOnly={props.readOnly} value={modal.value} onChange={modal.setValue} />
        </div>
        {modal.saveNotice ? <p className="campaign-review-world-history-notice">{modal.saveNotice}</p> : null}
        <WorldHistoryModalActions
          readOnly={props.readOnly}
          saving={modal.saving}
          canSave={modal.canSave}
          onClose={props.onClose}
          onSave={() => void modal.save(props.onSave)}
        />
      </div>
    </div>
  )
}
