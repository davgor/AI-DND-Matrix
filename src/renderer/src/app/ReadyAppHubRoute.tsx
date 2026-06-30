import type { RefObject } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { OnboardingStage } from '../../../shared/guidedCreation/stageRouting'
import type { useSidebarController } from '../sidebar/useSidebarController'
import { ReadyAppHubView } from './ReadyAppHubView'
import type { useReadyAppBodyState } from './useReadyAppBody'

export function ReadyAppHubRoute(props: {
  sidebarRef: RefObject<ReturnType<typeof useSidebarController> | null>
  detail: CampaignDetail
  stage: OnboardingStage
  setDetail: (detail: CampaignDetail | null) => void
  setStage: (stage: OnboardingStage) => void
  body: ReturnType<typeof useReadyAppBodyState>
  campaignCallbacks: {
    onCampaignSelected: (next: CampaignDetail) => void
    onOpenNewCampaign: () => void
    onRequestDelete: (campaignId: string) => void
  }
  onCharacterSetupComplete: () => void
}): JSX.Element {
  return (
    <ReadyAppHubView
      sidebarRef={props.sidebarRef}
      detail={props.detail}
      hubSnapshot={props.body.hubSnapshot!}
      hubLastPlayed={props.body.hubLastPlayed}
      hubGenerateOpen={props.body.hubGenerateOpen}
      enterPlayBlockerMessage={props.body.enterPlayBlockerMessage}
      campaignCallbacks={props.campaignCallbacks}
      onDetailChange={props.setDetail}
      onReviewContinue={() => props.setStage('characterSetup')}
      onCharacterSetupComplete={props.onCharacterSetupComplete}
      onGuidedIdentityAdvance={() => props.setStage('guidedOpeningScene')}
      onEnterPlay={props.body.handleEnterPlay}
      onRefreshDetail={props.body.refreshDetail}
      onHubResumeCharacter={props.body.handleResumeFromHub}
      onHubCreateCharacter={() => props.setStage('characterSetup')}
      onHubGenerateOpen={() => props.body.setHubGenerateOpen(true)}
      onHubGenerateClose={() => props.body.setHubGenerateOpen(false)}
      onHubGenerateSuccess={async (detail) => {
        props.setDetail(detail)
        props.body.setHubGenerateOpen(false)
        await props.body.refreshHubSnapshot()
      }}
    />
  )
}
