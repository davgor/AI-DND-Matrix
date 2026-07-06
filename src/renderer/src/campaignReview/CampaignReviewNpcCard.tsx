import type { Npc } from '../../../db/repositories/npcs'
import { CampaignReviewPanel } from './CampaignReviewPanel'
import { CampaignReviewNpcTraits } from './CampaignReviewNpcTraits'
import { FormattedText } from '../shared/FormattedText'

function combatTierBadge(npc: Npc): string | null {
  if (npc.combatTier === 'retired_adventurer' && npc.retiredAdventurerProfile) {
    return `Combat tier: retired ${npc.retiredAdventurerProfile}`
  }
  if (npc.combatTier === 'catalog') {
    return 'Combat tier: catalog'
  }
  return null
}

const DELETE_NPC_TOOLTIP = 'Delete this NPC permanently'

export function CampaignReviewNpcCard(props: {
  npc: Npc
  onDeleteNpc: () => void
}): JSX.Element {
  const { npc } = props
  const tierLabel = combatTierBadge(npc)
  return (
    <div className="campaign-review-npc-card">
      <div className="campaign-review-npc-header">
        <div className="campaign-review-npc-heading">
          <strong>
            {npc.name} ({npc.role})
          </strong>
          {FormattedText({ as: 'p', className: 'campaign-review-readonly-value', text: npc.disposition })}
        </div>
        <button
          type="button"
          className="campaign-review-icon-delete"
          title={DELETE_NPC_TOOLTIP}
          aria-label={DELETE_NPC_TOOLTIP}
          onClick={props.onDeleteNpc}
        >
          <span className="campaign-review-icon-delete-symbol" aria-hidden="true">
            ×
          </span>
        </button>
      </div>
      {npc.backstory ? (
        <CampaignReviewPanel legend="Backstory">
          <div className="campaign-review-npc-backstory">
            {FormattedText({ as: 'p', text: npc.backstory })}
            {tierLabel ? <p className="campaign-review-npc-tier">{tierLabel}</p> : null}
          </div>
        </CampaignReviewPanel>
      ) : null}
      <CampaignReviewNpcTraits npc={npc} />
    </div>
  )
}
