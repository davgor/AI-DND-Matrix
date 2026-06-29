import type { CampaignDetail } from '../../../main/campaignIpc'
import './mainPanel.css'

export interface MainPanelProps {
  detail: CampaignDetail | null
}

export function MainPanel(props: MainPanelProps): JSX.Element {
  const { detail } = props
  if (!detail?.campaign) {
    return (
      <div className="main-panel main-panel-empty">
        <div className="main-panel-empty-card">
          <p className="eyebrow">The table awaits</p>
          <p>Select or create a campaign to begin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="main-panel">
      <h1>{detail.campaign.name}</h1>
      <p>{detail.campaign.premisePrompt}</p>

      <h2>Regions</h2>
      <ul>
        {detail.regions.map((region) => (
          <li key={region.id}>
            {region.name} — {region.description}
          </li>
        ))}
      </ul>

      <h2>NPCs</h2>
      <ul>
        {detail.npcs.map((npc) => (
          <li key={npc.id}>
            {npc.name} ({npc.role})
          </li>
        ))}
      </ul>

      <h2>Story Thread</h2>
      <ul>
        {detail.storyThreads.map((thread) => (
          <li key={thread.id}>
            {thread.title}: {thread.summary}
          </li>
        ))}
      </ul>
    </div>
  )
}
