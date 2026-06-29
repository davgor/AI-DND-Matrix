import { useEffect, type MutableRefObject } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import { CampaignsRail } from './CampaignsRail'
import { useSidebarController } from './useSidebarController'
import './sidebar.css'

export interface SidebarProps {
  selectedCampaignId: string | null
  onCampaignSelected: (detail: CampaignDetail) => void
  onOpenNewCampaign: () => void
  onRequestDelete: (campaign: CampaignWithLastPlayed) => void
  sidebarRef?: MutableRefObject<ReturnType<typeof useSidebarController> | null>
}

export function Sidebar(props: SidebarProps): JSX.Element {
  const controller = useSidebarController({
    onCampaignSelected: props.onCampaignSelected,
    onOpenNewCampaign: props.onOpenNewCampaign
  })

  useEffect(() => {
    if (props.sidebarRef) {
      props.sidebarRef.current = controller
    }
  }, [controller, props.sidebarRef])

  return (
    <div className={controller.collapsed ? 'sidebar sidebar-collapsed' : 'sidebar'}>
      <CampaignsRail
        controller={controller}
        selectedCampaignId={props.selectedCampaignId}
        onOpenNewCampaign={props.onOpenNewCampaign}
        onRequestDelete={props.onRequestDelete}
      />
    </div>
  )
}
