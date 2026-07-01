import type { ReactNode } from 'react'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import { CampaignsRail } from '../sidebar/CampaignsRail'
import type { useSidebarController } from '../sidebar/useSidebarController'
import { PlaySheetRail } from './PlaySheetRail'
import { InCampaignLayout } from '../inCampaign/InCampaignLayout'
import type { InCampaignLayoutMode } from '../../../shared/inCampaignLayout/types'
import { PlayDmExpositionColumn } from './PlayDmExpositionColumn'
import { PlayerActionPanel } from './PlayerActionPanel'
import type { usePlayViewController } from './usePlayViewController'

function playDmColumn(
  layoutMode: InCampaignLayoutMode,
  controller: ReturnType<typeof usePlayViewController>,
  sceneContext: { regionName: string | null; regionBlurb: string | null }
): JSX.Element {
  return (
    <PlayDmExpositionColumn layoutMode={layoutMode} controller={controller} sceneContext={sceneContext} />
  )
}

function playPlayerColumn(
  controller: ReturnType<typeof usePlayViewController>,
  characterId: string
): JSX.Element {
  return (
    <PlayerActionPanel
      entries={controller.playerEntries}
      inputValue={controller.inputValue}
      onInputChange={controller.setInputValue}
      onSubmit={() => void controller.submitAction()}
      submitting={controller.submitting}
      inputBlocked={controller.obituaryBlocking}
      playerImprisoned={controller.playerImprisoned}
      combatState={controller.combatState}
      characterId={characterId}
    />
  )
}

export function PlayViewGrid(props: {
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
  sceneContext: { regionName: string | null; regionBlurb: string | null }
  showOverlayBackdrop: boolean
  onBackdropDismiss: () => void
  overlays?: ReactNode
}): JSX.Element {
  return (
    <InCampaignLayout
      mode={props.layoutMode}
      campaignsCollapsed={props.campaignsController.collapsed}
      sheetCollapsed={props.sheetCollapsed}
      showOverlayBackdrop={props.showOverlayBackdrop}
      onBackdropDismiss={props.onBackdropDismiss}
      campaigns={
        <CampaignsRail
          controller={props.campaignsController}
          selectedCampaignId={props.selectedCampaignId}
          onOpenNewCampaign={props.onOpenNewCampaign}
          onRequestDelete={props.onRequestDelete}
        />
      }
      dmExposition={playDmColumn(props.layoutMode, props.controller, props.sceneContext)}
      playerInteraction={playPlayerColumn(props.controller, props.characterId)}
      playerSheet={
        <PlaySheetRail
          campaignId={props.campaignId}
          characterId={props.characterId}
          collapsed={props.sheetCollapsed}
          onToggleCollapsed={props.onToggleSheet}
          refreshToken={props.controller.characterRefreshToken}
          combatState={props.controller.combatState}
        />
      }
      overlays={props.overlays}
    />
  )
}
