import { useCallback } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import type { ReactNode } from 'react'
import type { useSidebarController } from '../sidebar/useSidebarController'
import { PlaySessionChrome } from './PlaySessionChrome'
import { usePlaySessionChromeData } from './usePlaySessionChromeData'
import { useOverlayDismiss } from './useOverlayDismiss'
import { PlayViewGrid } from './PlayViewGrid'
import type { usePlayViewController } from './usePlayViewController'
import type { InCampaignLayoutMode } from '../../../shared/inCampaignLayout/types'
import { PlayCompanionRoster } from './PlayCompanionRoster'
import { usePlayCompanionRoster } from './usePlayCompanionRoster'

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
  onExitToCampaignHub: () => void
  overlays?: ReactNode
}

function PlaySessionChromeBar(props: {
  chromeData: ReturnType<typeof usePlaySessionChromeData>
  campaignsCollapsed: boolean
  controller: ReturnType<typeof usePlayViewController>
  onExitToCampaignHub: () => void
}): JSX.Element {
  return (
    <PlaySessionChrome
      characterName={props.chromeData.characterName}
      portraitPath={props.chromeData.portraitPath}
      regionName={props.chromeData.regionName}
      inGameDay={props.chromeData.inGameDay}
      campaignName={props.chromeData.campaignName}
      campaignsCollapsed={props.campaignsCollapsed}
      combatState={props.controller.combatState}
      showRolls={props.controller.showRolls}
      onOpenRecap={() => void props.controller.recap.open()}
      onToggleShowRolls={props.controller.toggleShowRolls}
      onExitToCampaignHub={props.onExitToCampaignHub}
    />
  )
}

export function InCampaignPlayColumns(props: InCampaignPlayColumnsProps): JSX.Element {
  const { controller, campaignsController } = props
  const chromeData = usePlaySessionChromeData(
    props.campaignId,
    props.characterId,
    controller.characterRefreshToken
  )
  const companionRoster = usePlayCompanionRoster(
    props.characterId,
    controller.characterRefreshToken
  )
  const onCollapseCampaigns = useCallback(() => {
    if (!campaignsController.collapsed) campaignsController.toggleCollapsed()
  }, [campaignsController])
  const onCollapseSheet = useCallback(() => {
    if (!props.sheetCollapsed) props.onToggleSheet()
  }, [props.sheetCollapsed, props.onToggleSheet])
  const overlayDismiss = useOverlayDismiss({
    layoutMode: props.layoutMode,
    campaignsCollapsed: campaignsController.collapsed,
    sheetCollapsed: props.sheetCollapsed,
    onCollapseCampaigns,
    onCollapseSheet
  })

  return (
    <div className="play-view-shell">
      <PlaySessionChromeBar
        chromeData={chromeData}
        campaignsCollapsed={campaignsController.collapsed}
        controller={controller}
        onExitToCampaignHub={props.onExitToCampaignHub}
      />
      <PlayCompanionRoster
        entries={companionRoster.entries}
        selectedId={companionRoster.selectedId}
        orderDraft={companionRoster.orderDraft}
        savingOrder={companionRoster.savingOrder}
        onSelect={companionRoster.onSelect}
        onOrderDraftChange={companionRoster.onOrderDraftChange}
        onSaveOrder={companionRoster.onSaveOrder}
      />
      <PlayViewGrid
        {...props}
        sceneContext={{ regionName: chromeData.regionName, regionBlurb: chromeData.regionBlurb }}
        showOverlayBackdrop={overlayDismiss.showBackdrop}
        onBackdropDismiss={overlayDismiss.onBackdropDismiss}
      />
    </div>
  )
}

export type PlayViewCampaignProps = Pick<
  InCampaignPlayColumnsProps,
  'selectedCampaignId' | 'onOpenNewCampaign' | 'onRequestDelete'
> & {
  onCampaignSelected: (detail: CampaignDetail) => void
}
