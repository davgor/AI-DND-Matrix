import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import type { SidebarController } from './useSidebarController'
import '../campaignDelete/campaignDelete.css'
import './campaignsRail.css'

export interface CampaignsRailProps {
  controller: SidebarController
  selectedCampaignId: string | null
  onOpenNewCampaign: () => void
  onRequestDelete: (campaign: CampaignWithLastPlayed) => void
}

function formatLastPlayed(lastPlayedAt: string | null): string {
  return lastPlayedAt ? new Date(lastPlayedAt).toLocaleDateString() : 'Never played'
}

function campaignInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export function CampaignsRail(props: CampaignsRailProps): JSX.Element {
  const { controller } = props

  return (
    <div className={controller.collapsed ? 'campaigns-rail campaigns-rail-collapsed' : 'campaigns-rail'}>
      <button
        type="button"
        className="campaigns-rail-toggle"
        aria-label={controller.collapsed ? 'Expand campaigns rail' : 'Collapse campaigns rail'}
        onClick={controller.toggleCollapsed}
      >
        {controller.collapsed ? '»' : '«'}
      </button>
      {controller.collapsed ? (
        <CollapsedCampaignQuickSwitch
          campaigns={controller.campaigns}
          selectedCampaignId={props.selectedCampaignId}
          onSelect={controller.handleSelect}
          onExpand={controller.toggleCollapsed}
        />
      ) : (
        <ExpandedCampaignList
          campaigns={controller.campaigns}
          selectedCampaignId={props.selectedCampaignId}
          onSelect={controller.handleSelect}
          onNewCampaign={props.onOpenNewCampaign}
          onRequestDelete={props.onRequestDelete}
        />
      )}
    </div>
  )
}

function CollapsedCampaignQuickSwitch(props: {
  campaigns: CampaignWithLastPlayed[]
  selectedCampaignId: string | null
  onSelect: (campaignId: string) => Promise<void>
  onExpand: () => void
}): JSX.Element {
  return (
    <div className="campaigns-rail-quick-switch">
      {props.campaigns.map((campaign) => (
        <button
          key={campaign.id}
          type="button"
          title={campaign.name}
          className={
            campaign.id === props.selectedCampaignId
              ? 'campaigns-rail-chip campaigns-rail-chip-active'
              : 'campaigns-rail-chip'
          }
          onClick={() => void props.onSelect(campaign.id)}
        >
          {campaignInitial(campaign.name)}
        </button>
      ))}
      <button type="button" className="campaigns-rail-chip campaigns-rail-chip-more" onClick={props.onExpand}>
        +
      </button>
    </div>
  )
}

function ExpandedCampaignList(props: {
  campaigns: CampaignWithLastPlayed[]
  selectedCampaignId: string | null
  onSelect: (campaignId: string) => Promise<void>
  onNewCampaign: () => void
  onRequestDelete: (campaign: CampaignWithLastPlayed) => void
}): JSX.Element {
  return (
    <>
      <ul className="campaigns-rail-list">
        {props.campaigns.map((campaign) => (
          <li key={campaign.id}>
            <div className="campaigns-rail-row">
              <button
                type="button"
                className={
                  campaign.id === props.selectedCampaignId
                    ? 'campaigns-rail-button campaigns-rail-button-active'
                    : 'campaigns-rail-button'
                }
                onClick={() => void props.onSelect(campaign.id)}
              >
                <span className="campaigns-rail-name">{campaign.name}</span>
                <span className="campaigns-rail-last-played">{formatLastPlayed(campaign.lastPlayedAt)}</span>
              </button>
              <button
                type="button"
                className="campaigns-rail-delete"
                aria-label={`Delete ${campaign.name}`}
                onClick={() => props.onRequestDelete(campaign)}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="campaigns-rail-new">
        <button type="button" className="campaigns-rail-new-button" onClick={props.onNewCampaign}>
          New Campaign
        </button>
      </div>
    </>
  )
}
