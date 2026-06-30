import type { RegionExtras } from '../../../main/campaignIpc'
import type { Npc } from '../../../db/repositories/npcs'
import type { Region } from '../../../db/repositories/regions'
import { EditableField } from './EditableField'
import { CampaignReviewNpcCard } from './CampaignReviewNpcCard'
import { CampaignReviewRegionExtras } from './CampaignReviewRegionExtras'
import type { EditNpcTraitsInput } from '../../../main/campaignEditIpc'

export function CampaignReviewRegionCard(props: {
  region: Region
  extras: RegionExtras | undefined
  npcs: Npc[]
  campaignId: string
  onSaveRegionDescription: (regionId: string, description: string) => Promise<void>
  onSaveNpcTraits: (input: EditNpcTraitsInput) => Promise<void>
  onGenerateNpc: () => void
}): JSX.Element {
  const { region, extras, npcs } = props

  return (
    <article className="campaign-review-region-card">
      <h3>{region.name}</h3>
      <EditableField
        label="Overview"
        initialValue={region.description}
        onSave={(value) => props.onSaveRegionDescription(region.id, value)}
      />
      {extras ? <CampaignReviewRegionExtras extras={extras} /> : null}
      <div className="campaign-review-npcs">
        <div className="campaign-review-npcs-header">
          <h4>NPCs</h4>
          <button type="button" className="campaign-review-generate-npc" onClick={props.onGenerateNpc}>
            Generate NPC
          </button>
        </div>
        {npcs.map((npc) => (
          <CampaignReviewNpcCard
            key={npc.id}
            campaignId={props.campaignId}
            npc={npc}
            onSaveTraits={props.onSaveNpcTraits}
          />
        ))}
      </div>
    </article>
  )
}
