import { useEffect } from 'react'
import { useSidebarController } from '../sidebar/useSidebarController'
import { usePlayerSheetCollapse } from '../characterSheet/PlayerSheetRail'
import { useInCampaignLayoutMode } from '../inCampaign/useInCampaignLayoutMode'
import { PromotionPrompt } from './PromotionPrompt'
import { RecapBanner } from './RecapBanner'
import { InCampaignPlayColumns, type PlayViewCampaignProps } from './InCampaignPlayColumns'
import { usePlayViewController } from './usePlayViewController'
import './playView.css'

export interface PlayViewProps extends PlayViewCampaignProps {
  campaignId: string
  characterId: string
  sidebarRef?: { current: ReturnType<typeof useSidebarController> | null }
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
    <>
      <InCampaignPlayColumns
        layoutMode={layoutMode}
        campaignsController={campaignsController}
        selectedCampaignId={props.selectedCampaignId}
        onOpenNewCampaign={props.onOpenNewCampaign}
        controller={controller}
        campaignId={props.campaignId}
        characterId={props.characterId}
        sheetCollapsed={sheetCollapse.collapsed}
        onToggleSheet={sheetCollapse.toggleCollapsed}
        overlays={
          <>
            <RecapBanner recap={controller.recap} />
            <PromotionPrompt promotion={controller.promotion} />
          </>
        }
      />
    </>
  )
}
