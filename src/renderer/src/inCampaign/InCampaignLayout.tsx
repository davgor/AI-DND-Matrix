import type { ReactNode } from 'react'
import type { InCampaignLayoutMode } from '../../../shared/inCampaignLayout/types'
import './inCampaignLayout.css'

export interface InCampaignLayoutProps {
  mode: InCampaignLayoutMode
  campaignsCollapsed: boolean
  sheetCollapsed: boolean
  campaigns: ReactNode
  dmExposition: ReactNode
  playerInteraction: ReactNode
  playerSheet: ReactNode
  overlays?: ReactNode
}

function layoutClassName(
  mode: InCampaignLayoutMode,
  campaignsCollapsed: boolean,
  sheetCollapsed: boolean
): string {
  const classes = ['in-campaign-layout', `in-campaign-layout--${mode}`]
  if (campaignsCollapsed) {
    classes.push('in-campaign-layout--campaigns-collapsed')
  }
  if (sheetCollapsed) {
    classes.push('in-campaign-layout--sheet-collapsed')
  }
  return classes.join(' ')
}

export function InCampaignLayout(props: InCampaignLayoutProps): JSX.Element {
  return (
    <div className={layoutClassName(props.mode, props.campaignsCollapsed, props.sheetCollapsed)}>
      <section className="in-campaign-column in-campaign-column--campaigns" aria-label="Campaigns">
        {props.campaigns}
      </section>
      <section className="in-campaign-column in-campaign-column--dm" aria-label="DM exposition">
        {props.dmExposition}
      </section>
      <section className="in-campaign-column in-campaign-column--player" aria-label="Player interaction">
        {props.playerInteraction}
      </section>
      <section className="in-campaign-column in-campaign-column--sheet" aria-label="Player sheet">
        {props.playerSheet}
      </section>
      {props.overlays ? <div className="in-campaign-overlays">{props.overlays}</div> : null}
    </div>
  )
}
