import { useState } from 'react'
import { EditableFieldEditView } from './editableFieldViews'
import { WorldHistoryModalActions } from './WorldHistoryModalActions'

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
  const [value, setValue] = useState(props.initialValue)
  const [saving, setSaving] = useState(false)

  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      await props.onSave(value)
      props.onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="campaign-review-overlay"
      role="presentation"
      onClick={() => {
        if (!saving) {
          props.onClose()
        }
      }}
    >
      <div
        className="campaign-review-generate-modal campaign-review-world-history-modal"
        role="dialog"
        aria-labelledby="campaign-review-world-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="campaign-review-world-history-title">World history</h2>
        <p>The full one-pager for your setting — deeper past, legends, and recent epochs.</p>
        <WorldHistoryModalBody readOnly={props.readOnly} value={value} onChange={setValue} />
        <WorldHistoryModalActions
          readOnly={props.readOnly}
          saving={saving}
          canSave={value !== props.initialValue}
          onClose={props.onClose}
          onSave={() => void handleSave()}
        />
      </div>
    </div>
  )
}
