import { BackgroundSelectionForm } from './BackgroundSelectionForm'
import { OnboardingBackButton } from '../onboarding/OnboardingBackButton'
import { useBackgroundSelection } from './useBackgroundSelection'
import './backgroundSelection.css'

export interface BackgroundSelectionProps {
  campaignId: string
  characterId: string
  savedBackgroundKey?: string | null
  savedBackgroundStory?: string | null
  onComplete: () => void
  onBack: () => void
}

export function BackgroundSelection(props: BackgroundSelectionProps): JSX.Element {
  const selection = useBackgroundSelection(
    props.campaignId,
    props.characterId,
    props.savedBackgroundKey,
    props.savedBackgroundStory
  )

  if (selection.loading) {
    return (
      <div className="background-selection background-selection-loading">
        <p>Loading backgrounds...</p>
        <OnboardingBackButton className="background-selection-back" onBack={props.onBack} />
      </div>
    )
  }
  if (!selection.roster.length) {
    return (
      <div className="background-selection background-selection-error">
        <p>{selection.error ?? 'No background roster available.'}</p>
        <OnboardingBackButton className="background-selection-back" onBack={props.onBack} />
      </div>
    )
  }

  return (
    <BackgroundSelectionForm
      roster={selection.roster}
      state={selection.state}
      setState={selection.setState}
      submitting={selection.submitting}
      error={selection.error}
      modalOpen={selection.modalOpen}
      modalLoading={selection.modalLoading}
      modalError={selection.modalError}
      onConfirm={() => void selection.confirm(props.onComplete)}
      onOpenGenerate={selection.openGenerate}
      onCloseGenerate={selection.closeGenerate}
      onGenerate={(playerPrompt) => void selection.generateStory(playerPrompt)}
      onBack={props.onBack}
    />
  )
}
