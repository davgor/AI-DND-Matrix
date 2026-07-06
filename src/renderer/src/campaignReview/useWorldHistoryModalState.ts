import { useEffect, useState } from 'react'

export function useWorldHistoryModalState(initialValue: string) {
  const [value, setValue] = useState(initialValue)
  const [savedBaseline, setSavedBaseline] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)

  useEffect(() => {
    setValue(initialValue)
    setSavedBaseline(initialValue)
    setSaveNotice(null)
  }, [initialValue])

  async function save(onSave: (value: string) => Promise<void>): Promise<void> {
    setSaving(true)
    setSaveNotice(null)
    try {
      await onSave(value)
      setSavedBaseline(value)
      setSaveNotice('Saved — world summary refreshed from your history.')
    } finally {
      setSaving(false)
    }
  }

  return {
    value,
    setValue,
    saving,
    saveNotice,
    canSave: value !== savedBaseline,
    save
  }
}
