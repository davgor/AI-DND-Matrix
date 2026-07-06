import { useState } from 'react'

export interface BackgroundSelectionGenerateModalProps {
  open: boolean
  loading: boolean
  error: string | null
  onCancel: () => void
  onGenerate: (playerPrompt: string) => void
}

export function BackgroundSelectionGenerateModal(
  props: BackgroundSelectionGenerateModalProps
): JSX.Element | null {
  const [prompt, setPrompt] = useState('')

  if (!props.open) {
    return null
  }

  return (
    <div className="background-selection-modal-backdrop" role="presentation">
      <div className="background-selection-modal" role="dialog" aria-labelledby="background-generate-title">
        <h2 id="background-generate-title">Write my background</h2>
        <p className="background-selection-modal-hint">
          Anything you want the writer to work in? (optional)
        </p>
        <textarea
          className="background-selection-modal-prompt"
          value={prompt}
          disabled={props.loading}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Optional guidance for the writer"
        />
        {props.error ? <p className="background-selection-error">{props.error}</p> : null}
        <div className="background-selection-modal-actions">
          <button type="button" className="background-selection-secondary" disabled={props.loading} onClick={props.onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="background-selection-primary"
            disabled={props.loading}
            onClick={() => props.onGenerate(prompt.trim())}
          >
            {props.loading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}
