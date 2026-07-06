import type { Npc } from '../../../db/repositories/npcs'
import { ALIGNMENT_LABELS, type Alignment } from '../../../shared/alignment/types'
import { resolveBackgroundDisplayLabel } from '../../../shared/characterBackground/resolveLabel'
import { findGenderRosterEntry } from '../../../shared/npcGender/types'
import { findNpcClassRosterEntry } from '../../../shared/npcClass/types'

function formatTemperament(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function CampaignReviewNpcTraits(props: { npc: Npc }): JSX.Element {
  const { npc } = props
  const backgroundLabel = resolveBackgroundDisplayLabel(npc.backgroundKey)
  const genderLabel = npc.genderKey ? findGenderRosterEntry(npc.genderKey)?.label : null
  const classLabel = npc.classKey ? findNpcClassRosterEntry(npc.classKey)?.label : null
  return (
    <dl className="campaign-review-npc-traits">
      <div className="campaign-review-npc-trait-row">
        <dt>Temperament</dt>
        <dd>{formatTemperament(npc.temperament)}</dd>
      </div>
      {npc.alignment ? (
        <div className="campaign-review-npc-trait-row">
          <dt>Alignment</dt>
          <dd>{ALIGNMENT_LABELS[npc.alignment as Alignment]}</dd>
        </div>
      ) : null}
      {genderLabel ? (
        <div className="campaign-review-npc-trait-row">
          <dt>Gender</dt>
          <dd>{genderLabel}</dd>
        </div>
      ) : null}
      {classLabel ? (
        <div className="campaign-review-npc-trait-row">
          <dt>Class</dt>
          <dd>{classLabel}</dd>
        </div>
      ) : null}
      {backgroundLabel ? (
        <div className="campaign-review-npc-trait-row">
          <dt>Background</dt>
          <dd>{backgroundLabel}</dd>
        </div>
      ) : null}
      {!npc.canSpeak ? (
        <div className="campaign-review-npc-trait-row">
          <dt>Speech</dt>
          <dd>Non-verbal (deaf or mute)</dd>
        </div>
      ) : null}
    </dl>
  )
}
