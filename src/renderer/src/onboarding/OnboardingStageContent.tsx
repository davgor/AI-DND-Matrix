import type { CampaignDetail } from '../../main/campaignIpc'
import type { OnboardingStage } from '../../shared/guidedCreation/stageRouting'
import { renderOnboardingStage } from './onboardingStageRoutes'

export interface OnboardingStageContentProps {
  stage: OnboardingStage
  detail: CampaignDetail | null
  onDetailChange: (detail: CampaignDetail) => void
  onReviewContinue: () => void
  onCharacterSetupComplete: () => void
  onGuidedIdentityAdvance: () => void
  onEnterPlay: () => void
  onRefreshDetail: () => Promise<void>
}

export function OnboardingStageContent(props: OnboardingStageContentProps): JSX.Element {
  return renderOnboardingStage(props.stage, props)
}
