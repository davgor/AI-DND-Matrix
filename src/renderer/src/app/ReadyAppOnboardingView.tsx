import type { RefObject } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { OnboardingStage } from '../../../shared/guidedCreation/stageRouting'
import { OnboardingStageContent } from '../onboarding/OnboardingStageContent'
import { Sidebar } from '../sidebar/Sidebar'
import type { useSidebarController } from '../sidebar/useSidebarController'

export function ReadyAppOnboardingView(props: {
  sidebarRef: RefObject<ReturnType<typeof useSidebarController> | null>
  stage: OnboardingStage
  detail: CampaignDetail | null
  campaignCallbacks: {
    onCampaignSelected: (next: CampaignDetail) => void
    onOpenNewCampaign: () => void
    onRequestDelete: (campaignId: string) => void
  }
  onDetailChange: (detail: CampaignDetail) => void
  onReviewContinue: () => void
  onCharacterSetupComplete: () => void
  onRaceSelectionComplete: () => void
  onRaceSelectionBack: () => void
  onEquipmentSelectionComplete: () => void
  onEquipmentSelectionBack: () => void
  onGuidedIdentityAdvance: () => void
  onEnterPlay: () => void
  enterPlayBlockerMessage: string | null
  onRefreshDetail: () => Promise<void>
}): JSX.Element {
  return (
    <>
      <Sidebar
        sidebarRef={props.sidebarRef}
        selectedCampaignId={props.detail?.campaign?.id ?? null}
        {...props.campaignCallbacks}
      />
      <OnboardingStageContent
        stage={props.stage}
        detail={props.detail}
        onDetailChange={props.onDetailChange}
        onReviewContinue={props.onReviewContinue}
        onCharacterSetupComplete={props.onCharacterSetupComplete}
        onRaceSelectionComplete={props.onRaceSelectionComplete}
        onRaceSelectionBack={props.onRaceSelectionBack}
        onEquipmentSelectionComplete={props.onEquipmentSelectionComplete}
      onEquipmentSelectionBack={props.onEquipmentSelectionBack}
        onGuidedIdentityAdvance={props.onGuidedIdentityAdvance}
        onEnterPlay={props.onEnterPlay}
        enterPlayBlockerMessage={props.enterPlayBlockerMessage}
        onRefreshDetail={props.onRefreshDetail}
      />
    </>
  )
}
