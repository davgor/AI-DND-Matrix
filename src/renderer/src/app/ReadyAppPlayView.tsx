import type { RefObject } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import { PlayView } from '../playView/PlayView'
import type { useSidebarController } from '../sidebar/useSidebarController'
import type { useReadyAppBodyState } from './useReadyAppBody'

export function ReadyAppPlayView(props: {
  detail: CampaignDetail
  body: ReturnType<typeof useReadyAppBodyState>
  sidebarRef: RefObject<ReturnType<typeof useSidebarController> | null>
  campaignCallbacks: {
    onCampaignSelected: (next: CampaignDetail) => void
    onOpenNewCampaign: () => void
    onRequestDelete: (campaign: CampaignWithLastPlayed) => void
  }
}): JSX.Element {
  return (
    <PlayView
      campaignId={props.detail.campaign!.id}
      characterId={props.body.activePlayer!.id}
      selectedCampaignId={props.detail.campaign!.id}
      sidebarRef={props.sidebarRef}
      onExitToCampaignHub={() => void props.body.handleExitToCampaignHub()}
      {...props.campaignCallbacks}
    />
  )
}
