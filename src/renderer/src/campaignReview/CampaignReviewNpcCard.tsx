import type { Npc } from '../../../db/repositories/npcs'
import type { EditNpcTraitsInput } from '../../../main/campaignEditIpc'
import { EditableField } from './EditableField'
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

export function CampaignReviewNpcCard(props: {
  campaignId: string
  npc: Npc
  onSaveTraits: (input: EditNpcTraitsInput) => Promise<void>
}): JSX.Element {
  const { npc } = props
  const tierLabel = combatTierBadge(npc)
  return (
    <div className="campaign-review-npc-card">
      <EditableField
        label={`${npc.name} (${npc.role})`}
        initialValue={npc.disposition}
        onSave={(disposition) =>
          props.onSaveTraits({ campaignId: props.campaignId, npcId: npc.id, disposition })
        }
      />
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
