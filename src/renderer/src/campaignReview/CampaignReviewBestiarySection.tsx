import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { BestiaryReviewEntry } from '../../../shared/bestiary/reviewRoster'
import { countBestiaryOrigins } from '../../../shared/bestiary/reviewRoster'
import { CampaignReviewBestiaryModal } from './CampaignReviewBestiaryModal'
import { CampaignReviewGenerateBestiaryModal } from './CampaignReviewGenerateBestiaryModal'

export function shouldShowBestiarySection(entries: BestiaryReviewEntry[]): boolean {
  return entries.length > 0
}

function BestiarySummaryChrome(props: {
  entries: BestiaryReviewEntry[]
  onView: () => void
}): JSX.Element {
  const { defaultCount, campaignCount } = countBestiaryOrigins(props.entries)
  return (
    <div className="campaign-review-readonly">
      <p className="campaign-review-lead">
        {campaignCount} campaign-specific · {defaultCount} default catalog enemies
      </p>
      <button type="button" className="campaign-review-view-bestiary" onClick={props.onView}>
        View Bestiary
      </button>
    </div>
  )
}

export function CampaignReviewBestiarySection(props: {
  campaignId: string
  entries: BestiaryReviewEntry[]
  onDetailChange: (detail: CampaignDetail) => void
  readOnly?: boolean
}): JSX.Element | null {
  if (!shouldShowBestiarySection(props.entries)) {
    return null
  }

  const [modalOpen, setModalOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <section className="campaign-review-bestiary">
      <h2>Bestiary</h2>
      <BestiarySummaryChrome entries={props.entries} onView={() => setModalOpen(true)} />
      {modalOpen ? (
        <CampaignReviewBestiaryModal
          entries={props.entries}
          canAdd={props.readOnly !== true}
          onAdd={() => {
            setModalOpen(false)
            setAddOpen(true)
          }}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
      {addOpen ? (
        <CampaignReviewGenerateBestiaryModal
          campaignId={props.campaignId}
          onDetailChange={props.onDetailChange}
          onClose={() => setAddOpen(false)}
        />
      ) : null}
    </section>
  )
}
