import type { CampaignDeleteFlow } from './useCampaignDeleteFlow'
import './campaignDelete.css'

export interface CampaignDeleteModalProps {
  flow: CampaignDeleteFlow
}

export function CampaignDeleteModal(props: CampaignDeleteModalProps): JSX.Element | null {
  const { flow } = props
  if (!flow.target) {
    return null
  }

  return (
    <div className="campaign-delete-overlay" role="presentation" onClick={() => flow.close()}>
      <div
        className="campaign-delete-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="campaign-delete-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            flow.close()
          }
        }}
      >
        <h2 id="campaign-delete-title">Delete “{flow.target.name}”?</h2>
        <p className="campaign-delete-warning">
          This permanently deletes the campaign, all saved regions, characters, events, and uploaded images.
          This cannot be undone.
        </p>
        {flow.error ? <p className="campaign-delete-error">{flow.error}</p> : null}
        <div className="campaign-delete-actions">
          <button type="button" disabled={flow.deleting} onClick={() => flow.close()}>
            Cancel
          </button>
          <button
            type="button"
            className="campaign-delete-confirm"
            disabled={flow.deleting}
            onClick={() => void flow.confirm()}
          >
            {flow.deleting ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}
