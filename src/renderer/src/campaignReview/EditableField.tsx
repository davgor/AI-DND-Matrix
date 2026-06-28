import { useState } from 'react'

export interface EditableFieldProps {
  label: string
  initialValue: string
  onSave: (value: string) => Promise<void>
}

export function EditableField(props: EditableFieldProps): JSX.Element {
  const [value, setValue] = useState(props.initialValue)
  const [saving, setSaving] = useState(false)

  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      await props.onSave(value)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="campaign-review-item">
      <strong>{props.label}</strong>
      <textarea value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="button" disabled={saving || value === props.initialValue} onClick={handleSave}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}
