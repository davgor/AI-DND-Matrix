import { useState } from 'react'
import type { Deity } from '../../../db/repositories/deities'
import { EditableField } from './EditableField'
import { CampaignReviewPantheonModal } from './CampaignReviewPantheonModal'
import { FormattedText } from '../shared/FormattedText'

export function shouldShowPantheonSection(
  pantheonSummary: string,
  deities: Deity[]
): boolean {
  return pantheonSummary.trim().length > 0 || deities.length > 0
}

export function CampaignReviewPantheonSection(props: {
  pantheonSummary: string
  deities: Deity[]
  onSaveSummary?: (pantheonSummary: string) => Promise<void>
  readOnly?: boolean
}): JSX.Element | null {
  if (!shouldShowPantheonSection(props.pantheonSummary, props.deities)) {
    return null
  }

  const [modalOpen, setModalOpen] = useState(false)
  const viewButton =
    props.deities.length > 0 ? (
      <button type="button" className="campaign-review-view-pantheon" onClick={() => setModalOpen(true)}>
        View Pantheon
      </button>
    ) : null

  return (
    <section className="campaign-review-pantheon">
      <h2>Pantheon</h2>
      {props.readOnly || !props.onSaveSummary ? (
        <div className="campaign-review-readonly">
          <strong>Summary</strong>
          {props.pantheonSummary
            ? FormattedText({
                as: 'p',
                className: 'campaign-review-readonly-value',
                text: props.pantheonSummary
              })
            : <p>No pantheon summary yet.</p>}
          {viewButton}
        </div>
      ) : (
        <EditableField
          label="Summary"
          initialValue={props.pantheonSummary}
          onSave={props.onSaveSummary}
          companionActions={viewButton}
        />
      )}
      {modalOpen ? (
        <CampaignReviewPantheonModal deities={props.deities} onClose={() => setModalOpen(false)} />
      ) : null}
    </section>
  )
}
