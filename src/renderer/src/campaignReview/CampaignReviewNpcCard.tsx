import type { Npc } from '../../../db/repositories/npcs'
import type { EditNpcTraitsInput } from '../../../main/campaignEditIpc'
import { EditableField } from './EditableField'
import { CampaignReviewNpcTraits } from './CampaignReviewNpcTraits'

export function CampaignReviewNpcCard(props: {
  campaignId: string
  npc: Npc
  onSaveTraits: (input: EditNpcTraitsInput) => Promise<void>
}): JSX.Element {
  const { npc } = props
  return (
    <div className="campaign-review-npc-card">
      <EditableField
        label={`${npc.name} (${npc.role})`}
        initialValue={npc.disposition}
        onSave={(disposition) =>
          props.onSaveTraits({ campaignId: props.campaignId, npcId: npc.id, disposition })
        }
      />
      <CampaignReviewNpcTraits campaignId={props.campaignId} npc={npc} onSaveTraits={props.onSaveTraits} />
    </div>
  )
}
