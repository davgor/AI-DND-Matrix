import { useState } from 'react'
import { EditableField } from './EditableField'
import { CampaignReviewWorldHistoryModal } from './CampaignReviewWorldHistoryModal'

function WorldSummaryField(props: {
  worldSummary: string
  worldHistory: string
  onSaveSummary: (worldSummary: string) => Promise<void>
  onViewHistory: () => void
}): JSX.Element {
  return (
    <>
      <EditableField
        label="Summary"
        initialValue={props.worldSummary}
        onSave={props.onSaveSummary}
        companionActions={
          props.worldHistory ? (
            <button type="button" className="campaign-review-view-world-history" onClick={props.onViewHistory}>
              View full history
            </button>
          ) : null
        }
      />
      <hr className="campaign-review-world-divider" />
    </>
  )
}

export function CampaignReviewWorldSection(props: {
  campaignId: string
  worldName: string
  worldSummary: string
  worldHistory: string
  onSaveSummary: (worldSummary: string) => Promise<void>
  onSaveHistory: (worldHistory: string) => Promise<void>
}): JSX.Element | null {
  if (!props.worldName && !props.worldSummary) {
    return null
  }

  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <section className="campaign-review-world">
      <h2>{props.worldName || 'World'}</h2>
      {props.worldSummary ? (
        <WorldSummaryField
          worldSummary={props.worldSummary}
          worldHistory={props.worldHistory}
          onSaveSummary={props.onSaveSummary}
          onViewHistory={() => setHistoryOpen(true)}
        />
      ) : (
        <div className="campaign-review-readonly">
          <strong>Summary</strong>
          <p>No summary yet.</p>
        </div>
      )}
      {props.worldHistory && !props.worldSummary ? (
        <button type="button" className="campaign-review-view-world-history" onClick={() => setHistoryOpen(true)}>
          View full history
        </button>
      ) : null}
      {historyOpen ? (
        <CampaignReviewWorldHistoryModal
          initialValue={props.worldHistory}
          onSave={props.onSaveHistory}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}
    </section>
  )
}
