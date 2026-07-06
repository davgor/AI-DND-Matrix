import { BackgroundSelectionForm } from './BackgroundSelectionForm'
import { BackgroundBackButton } from './BackgroundBackButton'
import { useBackgroundSelection } from './useBackgroundSelection'
import './backgroundSelection.css'

export interface BackgroundSelectionProps {
  campaignId: string
  characterId: string
  characterName: string
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
        <BackgroundBackButton onBack={props.onBack} />
      </div>
    )
  }
  if (!selection.roster.length) {
    return (
      <div className="background-selection background-selection-error">
        <p>{selection.error ?? 'No background roster available.'}</p>
        <BackgroundBackButton onBack={props.onBack} />
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
