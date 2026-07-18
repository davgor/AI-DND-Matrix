import type { CampaignDetail } from '../../../main/campaignIpc'
import type { PlayAwareHubSnapshot } from '../../../shared/campaignHub/types'
import type { OnboardingStage } from '../../../shared/guidedCreation/stageRouting'
import { renderOnboardingStage } from './onboardingStageRoutes'

export interface OnboardingStageContentProps {
  stage: OnboardingStage
  detail: CampaignDetail | null
  onDetailChange: (detail: CampaignDetail) => void
  onReviewContinue: () => void
  onCharacterSetupComplete: () => void
  onRaceSelectionComplete: () => void
  onRaceSelectionBack: () => void
  onBackgroundSelectionComplete: () => void
  onBackgroundSelectionBack: () => void
  onEquipmentSelectionComplete: () => void
  onEquipmentSelectionBack: () => void
  onGuidedIdentityAdvance: () => void
  onEnterPlay: () => void
  enterPlayBlockerMessage?: string | null
  onRefreshDetail: () => Promise<void>
  hubSnapshot?: PlayAwareHubSnapshot | null
  hubLastPlayed?: string
  onHubResumeCharacter?: (characterId: string) => void
  onHubCreateCharacter?: () => void
  onHubGenerateRegion?: () => void
}

export function OnboardingStageContent(props: OnboardingStageContentProps): JSX.Element {
  return renderOnboardingStage(props.stage, props)
}
