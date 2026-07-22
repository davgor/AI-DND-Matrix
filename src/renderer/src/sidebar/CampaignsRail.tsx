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
          onImport={() => void controller.importCampaign()}
          onExport={(id) => void controller.exportCampaign(id)}
          onDuplicate={(id) => void controller.duplicateCampaign(id)}
          onRequestDelete={props.onRequestDelete}
          portabilityError={controller.portabilityError}
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

function CampaignRowActions(props: {
  campaign: CampaignWithLastPlayed
  onExport: (campaignId: string) => void
  onDuplicate: (campaignId: string) => void
  onRequestDelete: (campaign: CampaignWithLastPlayed) => void
}): JSX.Element {
  const { campaign } = props
  return (
    <>
      <button
        type="button"
        className="campaigns-rail-action"
        aria-label={`Export ${campaign.name}`}
        title="Export"
        onClick={() => props.onExport(campaign.id)}
      >
        ↗
      </button>
      <button
        type="button"
        className="campaigns-rail-action"
        aria-label={`Duplicate ${campaign.name}`}
        title="Duplicate"
        onClick={() => props.onDuplicate(campaign.id)}
      >
        ⎘
      </button>
      <button
        type="button"
        className="campaigns-rail-delete"
        aria-label={`Delete ${campaign.name}`}
        onClick={() => props.onRequestDelete(campaign)}
      >
        ×
      </button>
    </>
  )
}

function CampaignRailFooter(props: {
  onNewCampaign: () => void
  onImport: () => void
  portabilityError: string | null
}): JSX.Element {
  return (
    <>
      {props.portabilityError ? (
        <p className="campaigns-rail-error" role="alert">
          {props.portabilityError}
        </p>
      ) : null}
      <div className="campaigns-rail-new">
        <button type="button" className="campaigns-rail-new-button" onClick={props.onNewCampaign}>
          New Campaign
        </button>
        <button type="button" className="campaigns-rail-import-button" onClick={props.onImport}>
          Import Campaign…
        </button>
      </div>
    </>
  )
}

function ExpandedCampaignList(props: {
  campaigns: CampaignWithLastPlayed[]
  selectedCampaignId: string | null
  onSelect: (campaignId: string) => Promise<void>
  onNewCampaign: () => void
  onImport: () => void
  onExport: (campaignId: string) => void
  onDuplicate: (campaignId: string) => void
  onRequestDelete: (campaign: CampaignWithLastPlayed) => void
  portabilityError: string | null
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
              <CampaignRowActions
                campaign={campaign}
                onExport={props.onExport}
                onDuplicate={props.onDuplicate}
                onRequestDelete={props.onRequestDelete}
              />
            </div>
          </li>
        ))}
      </ul>
      <CampaignRailFooter
        onNewCampaign={props.onNewCampaign}
        onImport={props.onImport}
        portabilityError={props.portabilityError}
      />
    </>
  )
}
