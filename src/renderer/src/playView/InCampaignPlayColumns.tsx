import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import type { ReactNode } from 'react'
import { CampaignsRail } from '../sidebar/CampaignsRail'
import type { useSidebarController } from '../sidebar/useSidebarController'
import { PlayerSheetRail } from '../characterSheet/PlayerSheetRail'
import { InCampaignLayout } from '../inCampaign/InCampaignLayout'
import type { InCampaignLayoutMode } from '../../../shared/inCampaignLayout/types'
import { PlayDmExpositionColumn } from './PlayDmExpositionColumn'
import { PlayerActionPanel } from './PlayerActionPanel'
import type { usePlayViewController } from './usePlayViewController'

interface InCampaignPlayColumnsProps {
  layoutMode: InCampaignLayoutMode
  campaignsController: ReturnType<typeof useSidebarController>
  selectedCampaignId: string | null
  onOpenNewCampaign: () => void
  onRequestDelete: (campaign: CampaignWithLastPlayed) => void
  controller: ReturnType<typeof usePlayViewController>
  campaignId: string
  characterId: string
  sheetCollapsed: boolean
  onToggleSheet: () => void
  overlays?: ReactNode
}

export function InCampaignPlayColumns(props: InCampaignPlayColumnsProps): JSX.Element {
  const { controller, campaignsController } = props
  return (
    <InCampaignLayout
      mode={props.layoutMode}
      campaignsCollapsed={campaignsController.collapsed}
      sheetCollapsed={props.sheetCollapsed}
      campaigns={
        <CampaignsRail
          controller={campaignsController}
          selectedCampaignId={props.selectedCampaignId}
          onOpenNewCampaign={props.onOpenNewCampaign}
          onRequestDelete={props.onRequestDelete}
        />
      }
      dmExposition={<PlayDmExpositionColumn layoutMode={props.layoutMode} controller={controller} />}
      playerInteraction={
        <PlayerActionPanel
          entries={controller.playerEntries}
          inputValue={controller.inputValue}
          onInputChange={controller.setInputValue}
          onSubmit={() => void controller.submitAction()}
          submitting={controller.submitting}
        />
      }
      playerSheet={
        <PlayerSheetRail
          campaignId={props.campaignId}
          characterId={props.characterId}
          collapsed={props.sheetCollapsed}
          onToggleCollapsed={props.onToggleSheet}
          refreshToken={controller.characterRefreshToken}
        />
      }
      overlays={props.overlays}
    />
  )
}

export type PlayViewCampaignProps = Pick<
  InCampaignPlayColumnsProps,
  'selectedCampaignId' | 'onOpenNewCampaign' | 'onRequestDelete'
> & {
  onCampaignSelected: (detail: CampaignDetail) => void
}
