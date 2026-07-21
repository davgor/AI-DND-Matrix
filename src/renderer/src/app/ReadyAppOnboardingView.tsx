import type { ComponentProps, RefObject } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import type { OnboardingStage } from '../../../shared/guidedCreation/stageRouting'
import { OnboardingStageContent } from '../onboarding/OnboardingStageContent'
import { Sidebar } from '../sidebar/Sidebar'
import type { useSidebarController } from '../sidebar/useSidebarController'

function onboardingStageContentProps(
  props: Omit<
    Parameters<typeof ReadyAppOnboardingView>[0],
    'sidebarRef' | 'campaignCallbacks'
  >
): ComponentProps<typeof OnboardingStageContent> {
  return {
    stage: props.stage,
    detail: props.detail,
    onDetailChange: props.onDetailChange,
    onReviewContinue: props.onReviewContinue,
    onCharacterSetupComplete: props.onCharacterSetupComplete,
    onRaceSelectionComplete: props.onRaceSelectionComplete,
    onRaceSelectionBack: props.onRaceSelectionBack,
    onBackgroundSelectionComplete: props.onBackgroundSelectionComplete,
    onBackgroundSelectionBack: props.onBackgroundSelectionBack,
    onEquipmentSelectionComplete: props.onEquipmentSelectionComplete,
    onEquipmentSelectionBack: props.onEquipmentSelectionBack,
    onCompanionsSkip: props.onCompanionsSkip,
    onCompanionsComplete: props.onCompanionsComplete,
    onCompanionsBack: props.onCompanionsBack,
    onGuidedIdentityAdvance: props.onGuidedIdentityAdvance,
    onEnterPlay: props.onEnterPlay,
    enterPlayBlockerMessage: props.enterPlayBlockerMessage,
    onRefreshDetail: props.onRefreshDetail
  }
}

export function ReadyAppOnboardingView(props: {
  sidebarRef: RefObject<ReturnType<typeof useSidebarController> | null>
  stage: OnboardingStage
  detail: CampaignDetail | null
  campaignCallbacks: {
    onCampaignSelected: (next: CampaignDetail) => void
    onOpenNewCampaign: () => void
    onRequestDelete: (campaign: CampaignWithLastPlayed) => void
  }
  onDetailChange: (detail: CampaignDetail) => void
  onReviewContinue: () => void
  onCharacterSetupComplete: () => void
  onRaceSelectionComplete: () => void
  onRaceSelectionBack: () => void
  onBackgroundSelectionComplete: () => void
  onBackgroundSelectionBack: () => void
  onEquipmentSelectionComplete: () => void
  onEquipmentSelectionBack: () => void
  onCompanionsSkip: () => void
  onCompanionsComplete: () => void
  onCompanionsBack: () => void
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
      <OnboardingStageContent {...onboardingStageContentProps(props)} />
    </>
  )
}
