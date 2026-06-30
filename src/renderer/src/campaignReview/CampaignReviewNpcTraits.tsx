import type { Npc } from '../../../db/repositories/npcs'
import { ALIGNMENT_LABELS, type Alignment } from '../../../shared/alignment/types'

function formatTemperament(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function CampaignReviewNpcTraits(props: { npc: Npc }): JSX.Element {
  const { npc } = props
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
      {!npc.canSpeak ? (
        <div className="campaign-review-npc-trait-row">
          <dt>Speech</dt>
          <dd>Non-verbal (deaf or mute)</dd>
        </div>
      ) : null}
    </dl>
  )
}
