import type { CampaignDetail } from '../../../main/campaignIpc'
import { EditableField } from './EditableField'
import './campaignReview.css'

export interface CampaignReviewProps {
  detail: CampaignDetail
  onDetailChange: (detail: CampaignDetail) => void
  onContinue: () => void
}

export function CampaignReview(props: CampaignReviewProps): JSX.Element {
  const { detail } = props
  const campaignId = detail.campaign?.id ?? ''

  async function saveRegionDescription(regionId: string, description: string): Promise<void> {
    const next = await window.campaigns.editRegionDescription({ campaignId, regionId, description })
    props.onDetailChange(next)
  }

  async function saveNpcDisposition(npcId: string, disposition: string): Promise<void> {
    const next = await window.campaigns.editNpcDisposition({ campaignId, npcId, disposition })
    props.onDetailChange(next)
  }

  return (
    <div className="campaign-review">
      <h1>{detail.campaign?.name}</h1>

      <h2>Regions</h2>
      {detail.regions.map((region) => (
        <EditableField
          key={region.id}
          label={region.name}
          initialValue={region.description}
          onSave={(value) => saveRegionDescription(region.id, value)}
        />
      ))}

      <h2>NPCs</h2>
      {detail.npcs.map((npc) => (
        <EditableField
          key={npc.id}
          label={`${npc.name} (${npc.role})`}
          initialValue={npc.disposition}
          onSave={(value) => saveNpcDisposition(npc.id, value)}
        />
      ))}

      <h2>Story Thread</h2>
      <ul>
        {detail.storyThreads.map((thread) => (
          <li key={thread.id}>
            {thread.title}: {thread.summary}
          </li>
        ))}
      </ul>

      <button type="button" className="campaign-review-continue" onClick={props.onContinue}>
        Continue to character creation
      </button>
    </div>
  )
}
