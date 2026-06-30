import type { Npc } from '../../../db/repositories/npcs'
import { FormattedText } from '../shared/FormattedText'
import { CampaignReviewNpcTraits } from './CampaignReviewNpcTraits'

function combatTierBadge(npc: Npc): string | null {
  if (npc.combatTier === 'retired_adventurer' && npc.retiredAdventurerProfile) {
    return `Combat tier: retired ${npc.retiredAdventurerProfile}`
  }
  if (npc.combatTier === 'catalog') {
    return 'Combat tier: catalog'
  }
  return null
}

export function CampaignReviewReadOnlyNpcCard(props: { npc: Npc }): JSX.Element {
  const { npc } = props
  const tierLabel = combatTierBadge(npc)
  return (
    <div className="campaign-review-npc-card">
      <div className="campaign-review-readonly">
        <strong>
          {npc.name} ({npc.role})
        </strong>
        {FormattedText({ as: 'p', className: 'campaign-review-readonly-value', text: npc.disposition })}
      </div>
      {npc.backstory ? (
        <div className="campaign-review-npc-backstory">
          <p className="campaign-review-field-label">Backstory</p>
          {FormattedText({ as: 'p', text: npc.backstory })}
          {tierLabel ? <p className="campaign-review-npc-tier">{tierLabel}</p> : null}
        </div>
      ) : null}
      <CampaignReviewNpcTraits npc={npc} />
    </div>
  )
}
