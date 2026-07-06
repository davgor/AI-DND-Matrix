import { useState, type ReactNode } from 'react'
import { EditableFieldEditView, EditableFieldReadView } from './editableFieldViews'

export interface EditableFieldProps {
  label: string
  initialValue: string
  onSave: (value: string) => Promise<void>
  companionActions?: ReactNode
}

export function EditableField(props: EditableFieldProps): JSX.Element {
  const [value, setValue] = useState(props.initialValue)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      await props.onSave(value)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel(): void {
    setValue(props.initialValue)
    setEditing(false)
  }

  return (
    <div className="campaign-review-item">
      <strong>{props.label}</strong>
      {editing ? (
        <>
          <EditableFieldEditView value={value} onChange={setValue} />
          <button type="button" disabled={saving || value === props.initialValue} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" disabled={saving} onClick={handleCancel}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <EditableFieldReadView value={value} />
          <div className="campaign-review-item-actions">
            <button type="button" onClick={() => setEditing(true)}>
              Edit
            </button>
            {props.companionActions}
          </div>
        </>
      )}
    </div>
  )
}
