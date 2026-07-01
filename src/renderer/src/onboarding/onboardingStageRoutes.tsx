import { findIncompletePlayerCharacter, findPlayerCharacter, type OnboardingStage } from '../../../shared/guidedCreation/stageRouting'
import { CampaignHub } from '../campaignHub/CampaignHub'
import { CampaignReview } from '../campaignReview/CampaignReview'
import { CharacterSetup } from '../characterSetup/CharacterSetup'
import { GuidedIdentityStage, GuidedOpeningSceneStage } from '../guidedCreation/GuidedCreationStages'
import { MainPanel } from '../mainPanel/MainPanel'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { OnboardingStageContentProps } from './OnboardingStageContent'

function ReviewStage(props: OnboardingStageContentProps): JSX.Element {
  if (!props.detail) {
    return <MainPanel detail={props.detail} />
  }
  return (
    <CampaignReview
      detail={props.detail}
      onDetailChange={props.onDetailChange}
      onContinue={props.onReviewContinue}
    />
  )
}

function CampaignHubStage(props: OnboardingStageContentProps): JSX.Element {
  if (!props.hubSnapshot) {
    return <MainPanel detail={props.detail} />
  }
  return (
    <CampaignHub
      snapshot={props.hubSnapshot}
      lastPlayed={props.hubLastPlayed ?? ''}
      onResumeCharacter={props.onHubResumeCharacter ?? (() => {})}
      onCreateCharacter={props.onHubCreateCharacter ?? (() => {})}
      onGenerateRegion={props.onHubGenerateRegion ?? (() => {})}
    />
  )
}

function CharacterSetupStage(props: OnboardingStageContentProps): JSX.Element {
  if (!props.detail?.campaign) {
    return <MainPanel detail={props.detail} />
  }
  return <CharacterSetup campaignId={props.detail.campaign.id} onComplete={props.onCharacterSetupComplete} />
}

function guidedCreationPlayer(characters: CampaignDetail['characters']): ReturnType<typeof findPlayerCharacter> {
  return findIncompletePlayerCharacter(characters) ?? findPlayerCharacter(characters)
}

function GuidedIdentityRoute(props: OnboardingStageContentProps): JSX.Element {
  const player = guidedCreationPlayer(props.detail?.characters ?? [])
  if (!props.detail?.campaign || !player) {
    return <MainPanel detail={props.detail} />
  }
  return (
    <GuidedIdentityStage
      campaignId={props.detail.campaign.id}
      character={player}
      onAdvance={props.onGuidedIdentityAdvance}
      onRefresh={props.onRefreshDetail}
    />
  )
}

function GuidedOpeningSceneRoute(props: OnboardingStageContentProps): JSX.Element {
  const player = guidedCreationPlayer(props.detail?.characters ?? [])
  if (!props.detail?.campaign || !player) {
    return <MainPanel detail={props.detail} />
  }
  return (
    <GuidedOpeningSceneStage
      campaignId={props.detail.campaign.id}
      character={player}
      onReadyToEnterPlay={props.createHandleReadyToEnterPlay(player.id)}
      enterPlayBlockerMessage={props.enterPlayBlockerMessage}
      onRefresh={props.onRefreshDetail}
    />
  )
}

export function renderOnboardingStage(stage: OnboardingStage, props: OnboardingStageContentProps): JSX.Element {
  switch (stage) {
    case 'review':
      return <ReviewStage {...props} />
    case 'characterSetup':
      return <CharacterSetupStage {...props} />
    case 'guidedIdentity':
      return <GuidedIdentityRoute {...props} />
    case 'guidedOpeningScene':
      return <GuidedOpeningSceneRoute {...props} />
    case 'campaignHub':
      return <CampaignHubStage {...props} />
    default:
      return <MainPanel detail={props.detail} />
  }
}
