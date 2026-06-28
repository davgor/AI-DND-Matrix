import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import { useSidebarController } from './useSidebarController'
import './sidebar.css'

export interface SidebarProps {
  selectedCampaignId: string | null
  onCampaignSelected: (detail: CampaignDetail) => void
  onCampaignGenerated: (detail: CampaignDetail) => void
}

function formatLastPlayed(lastPlayedAt: string | null): string {
  return lastPlayedAt ? new Date(lastPlayedAt).toLocaleDateString() : 'Never played'
}

export function Sidebar(props: SidebarProps): JSX.Element {
  const controller = useSidebarController({
    onCampaignSelected: props.onCampaignSelected,
    onCampaignGenerated: props.onCampaignGenerated
  })

  return (
    <div className={controller.collapsed ? 'sidebar sidebar-collapsed' : 'sidebar'}>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label="Toggle sidebar"
        onClick={controller.toggleCollapsed}
      >
        {controller.collapsed ? '»' : '«'}
      </button>
      {!controller.collapsed && (
        <SidebarContent
          campaigns={controller.campaigns}
          selectedCampaignId={props.selectedCampaignId}
          premisePrompt={controller.premisePrompt}
          generating={controller.generating}
          onSelect={controller.handleSelect}
          onPremisePromptChange={controller.setPremisePrompt}
          onGenerate={controller.handleGenerate}
        />
      )}
    </div>
  )
}

interface SidebarContentProps {
  campaigns: CampaignWithLastPlayed[]
  selectedCampaignId: string | null
  premisePrompt: string
  generating: boolean
  onSelect: (campaignId: string) => void
  onPremisePromptChange: (value: string) => void
  onGenerate: () => void
}

function SidebarContent(props: SidebarContentProps): JSX.Element {
  return (
    <>
      <ul className="sidebar-campaign-list">
        {props.campaigns.map((campaign) => (
          <li key={campaign.id}>
            <button
              type="button"
              className={
                campaign.id === props.selectedCampaignId
                  ? 'sidebar-campaign-button sidebar-campaign-active'
                  : 'sidebar-campaign-button'
              }
              onClick={() => props.onSelect(campaign.id)}
            >
              <span className="sidebar-campaign-name">{campaign.name}</span>
              <span className="sidebar-campaign-last-played">
                {formatLastPlayed(campaign.lastPlayedAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-new-campaign">
        <input
          type="text"
          placeholder="Describe your campaign..."
          value={props.premisePrompt}
          disabled={props.generating}
          onChange={(event) => props.onPremisePromptChange(event.target.value)}
        />
        <button type="button" disabled={props.generating} onClick={props.onGenerate}>
          {props.generating ? 'Generating...' : 'New Campaign'}
        </button>
      </div>
    </>
  )
}
