import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import type { PlayAwareHubSnapshot } from '../../../shared/campaignHub/types'
import { Sidebar } from '../sidebar/Sidebar'
import type { useSidebarController } from '../sidebar/useSidebarController'
import { OnboardingStageContent } from '../onboarding/OnboardingStageContent'
import { CampaignReviewGenerateModal } from '../campaignReview/CampaignReviewGenerateModal'
import type { RefObject } from 'react'

export interface ReadyAppHubViewProps {
  sidebarRef: RefObject<ReturnType<typeof useSidebarController> | null>
  detail: CampaignDetail
  hubSnapshot: PlayAwareHubSnapshot
  hubLastPlayed: string
  hubGenerateOpen: boolean
  enterPlayBlockerMessage: string | null
  campaignCallbacks: {
    onCampaignSelected: (next: CampaignDetail) => void
    onOpenNewCampaign: () => void
    onRequestDelete: (campaign: CampaignWithLastPlayed) => void
  }
  onDetailChange: (detail: CampaignDetail) => void
  onReviewContinue: () => void
  onCharacterSetupComplete: () => void
  onGuidedIdentityAdvance: () => void
  onEnterPlay: () => void
  onRefreshDetail: () => Promise<void>
  onHubResumeCharacter: (characterId: string) => void
  onHubCreateCharacter: () => void
  onHubGenerateOpen: () => void
  onHubGenerateClose: () => void
  onHubGenerateSuccess: (detail: CampaignDetail) => Promise<void>
}

export function ReadyAppHubView(props: ReadyAppHubViewProps): JSX.Element {
  return (
    <>
      <Sidebar
        sidebarRef={props.sidebarRef}
        selectedCampaignId={props.detail.campaign?.id ?? null}
        {...props.campaignCallbacks}
      />
      <OnboardingStageContent
        stage="campaignHub"
        detail={props.detail}
        onDetailChange={props.onDetailChange}
        onReviewContinue={props.onReviewContinue}
        onCharacterSetupComplete={props.onCharacterSetupComplete}
        onRaceSelectionComplete={() => undefined}
        onRaceSelectionBack={() => undefined}
        onBackgroundSelectionComplete={() => undefined}
        onBackgroundSelectionBack={() => undefined}
        onEquipmentSelectionComplete={() => undefined}
        onEquipmentSelectionBack={() => undefined}
        onGuidedIdentityAdvance={props.onGuidedIdentityAdvance}
        onEnterPlay={props.onEnterPlay}
        enterPlayBlockerMessage={props.enterPlayBlockerMessage}
        onRefreshDetail={props.onRefreshDetail}
        hubSnapshot={props.hubSnapshot}
        hubLastPlayed={props.hubLastPlayed}
        onHubResumeCharacter={props.onHubResumeCharacter}
        onHubCreateCharacter={props.onHubCreateCharacter}
        onHubGenerateRegion={props.onHubGenerateOpen}
      />
      {props.detail.campaign && props.hubGenerateOpen ? (
        <CampaignReviewGenerateModal
          campaignId={props.detail.campaign.id}
          onDetailChange={(detail) => void props.onHubGenerateSuccess(detail)}
          onClose={props.onHubGenerateClose}
        />
      ) : null}
    </>
  )
}
