import { useState } from 'react'
import type { Deity } from '../../../db/repositories/deities'
import type {
  Faction,
  FactionPressure,
  FactionRelation
} from '../../../shared/factions'
import { EditableField } from './EditableField'
import { CampaignReviewFactionsModal } from './CampaignReviewFactionsModal'
import { FormattedText } from '../shared/FormattedText'

export function shouldShowFactionsSection(
  factionsSummary: string,
  factions: Faction[]
): boolean {
  return factionsSummary.trim().length > 0 || factions.length > 0
}

function FactionsSummaryChrome(props: {
  factionsSummary: string
  readOnly: boolean
  onSaveSummary?: (factionsSummary: string) => Promise<void>
  viewButton: JSX.Element | null
}): JSX.Element {
  if (props.readOnly || !props.onSaveSummary) {
    return (
      <div className="campaign-review-readonly">
        <strong>Summary</strong>
        {props.factionsSummary
          ? FormattedText({
              as: 'p',
              className: 'campaign-review-readonly-value',
              text: props.factionsSummary
            })
          : <p>No factions summary yet.</p>}
        {props.viewButton}
      </div>
    )
  }
  return (
    <EditableField
      label="Summary"
      initialValue={props.factionsSummary}
      onSave={props.onSaveSummary}
      companionActions={props.viewButton}
    />
  )
}

export function CampaignReviewFactionsSection(props: {
  factionsSummary: string
  factionPressure: FactionPressure
  factions: Faction[]
  relations: FactionRelation[]
  deities: Deity[]
  onSaveSummary?: (factionsSummary: string) => Promise<void>
  readOnly?: boolean
}): JSX.Element | null {
  if (!shouldShowFactionsSection(props.factionsSummary, props.factions)) {
    return null
  }

  const [modalOpen, setModalOpen] = useState(false)
  const hasDetails = props.factions.length > 0 || props.relations.length > 0
  const viewButton = hasDetails ? (
    <button
      type="button"
      className="campaign-review-view-factions"
      onClick={() => setModalOpen(true)}
    >
      View Factions
    </button>
  ) : null

  return (
    <section className="campaign-review-factions">
      <h2>Factions</h2>
      <p className="campaign-review-faction-pressure">
        Pressure: <strong>{props.factionPressure}</strong>
      </p>
      <FactionsSummaryChrome
        factionsSummary={props.factionsSummary}
        readOnly={props.readOnly === true}
        onSaveSummary={props.onSaveSummary}
        viewButton={viewButton}
      />
      {modalOpen ? (
        <CampaignReviewFactionsModal
          factionPressure={props.factionPressure}
          factions={props.factions}
          relations={props.relations}
          deities={props.deities}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </section>
  )
}
