import { RaceSelectionForm } from './RaceSelectionForm'
import { RaceBackButton } from './RaceBackButton'
import { useRaceSelection } from './useRaceSelection'

export interface RaceSelectionProps {
  campaignId: string
  characterId: string
  characterName: string
  onComplete: () => void
  onBack: () => void
}

export function RaceSelection(props: RaceSelectionProps): JSX.Element {
  const selection = useRaceSelection(props.campaignId, props.characterId)

  if (selection.loading) {
    return (
      <div className="race-selection race-selection-loading">
        <p>Loading race options...</p>
        <RaceBackButton onBack={props.onBack} />
      </div>
    )
  }
  if (!selection.roster.length) {
    return (
      <div className="race-selection race-selection-error">
        <p>{selection.error ?? 'No race roster available.'}</p>
        <RaceBackButton onBack={props.onBack} />
      </div>
    )
  }

  return (
    <RaceSelectionForm
      roster={selection.roster}
      campaignRaces={selection.campaignRaces}
      state={selection.state}
      setState={selection.setState}
      previewLoading={selection.previewLoading}
      submitting={selection.submitting}
      error={selection.error}
      onPickPreset={selection.pickPreset}
      onPickCustom={selection.pickCustom}
      onPreviewLore={() => void selection.previewLore()}
      onConfirm={() => void selection.confirm(props.onComplete)}
      onBack={props.onBack}
    />
  )
}
