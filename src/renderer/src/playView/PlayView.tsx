import { useEffect } from 'react'
import { useSidebarController } from '../sidebar/useSidebarController'
import { usePlayerSheetCollapse } from './PlaySheetRail'
import { useInCampaignLayoutMode } from '../inCampaign/useInCampaignLayoutMode'
import { PromotionPrompt } from './PromotionPrompt'
import { RecapBanner } from './RecapBanner'
import { InCampaignPlayColumns, type PlayViewCampaignProps } from './InCampaignPlayColumns'
import { LevelUpModal } from './LevelUpModal'
import { ObituaryDraftingModal } from './ObituaryDraftingModal'
import { usePlayViewController } from './usePlayViewController'
import { D20Overlay } from './d20Overlay/D20Overlay'
import './playView.css'

export interface PlayViewProps extends PlayViewCampaignProps {
  campaignId: string
  characterId: string
  sidebarRef?: { current: ReturnType<typeof useSidebarController> | null }
  onExitToCampaignHub: () => void
}

export function PlayView(props: PlayViewProps): JSX.Element {
  const controller = usePlayViewController(props.campaignId, props.characterId)
  const layoutMode = useInCampaignLayoutMode()
  const sheetCollapse = usePlayerSheetCollapse()
  const campaignsController = useSidebarController({
    onCampaignSelected: props.onCampaignSelected,
    onOpenNewCampaign: props.onOpenNewCampaign
  })

  useEffect(() => {
    if (props.sidebarRef) {
      props.sidebarRef.current = campaignsController
    }
  }, [campaignsController, props.sidebarRef])

  return (
    <InCampaignPlayColumns
      layoutMode={layoutMode}
      campaignsController={campaignsController}
      selectedCampaignId={props.selectedCampaignId}
      onOpenNewCampaign={props.onOpenNewCampaign}
      onRequestDelete={props.onRequestDelete}
      controller={controller}
      campaignId={props.campaignId}
      characterId={props.characterId}
      sheetCollapsed={sheetCollapse.collapsed}
      onToggleSheet={sheetCollapse.toggleCollapsed}
      onExitToCampaignHub={props.onExitToCampaignHub}
      overlays={
        <>
          <D20Overlay lastCheck={controller.lastCheck ?? null} showRolls={controller.showRolls} />
          <RecapBanner recap={controller.recap} />
          <PromotionPrompt promotion={controller.promotion} />
          <LevelUpModal
            characterId={props.characterId}
            refreshToken={controller.characterRefreshToken}
            onComplete={controller.notifyPerkChosen}
          />
          {controller.obituaryRequest ? (
            <ObituaryDraftingModal
              request={controller.obituaryRequest}
              onDismiss={() => {
                controller.clearObituaryDrafting()
                props.onExitToCampaignHub()
              }}
            />
          ) : null}
        </>
      }
    />
  )
}
