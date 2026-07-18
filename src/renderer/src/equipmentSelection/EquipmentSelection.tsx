import { EquipmentSelectionForm } from './EquipmentSelectionForm'
import { OnboardingBackButton } from '../onboarding/OnboardingBackButton'
import { useLoadoutOffer } from './useLoadoutOffer'
import { useSubmitLoadout } from './useSubmitLoadout'
export interface EquipmentSelectionProps {
  characterId: string
  onComplete: () => void
  onBack: () => void
}

export function EquipmentSelection(props: EquipmentSelectionProps): JSX.Element {
  const loaded = useLoadoutOffer(props.characterId)
  const submit = useSubmitLoadout(props.characterId, loaded.offer, loaded.state, loaded.setError)
  const selection = {
    offer: loaded.offer,
    state: loaded.state,
    setState: loaded.setState,
    loading: loaded.loading,
    submitting: submit.submitting,
    error: loaded.error,
    confirm: submit.submitLoadout
  }

  if (selection.loading) {
    return (
      <div className="equipment-selection equipment-selection-loading">
        <p>Loading gear options...</p>
        <OnboardingBackButton onBack={props.onBack} />
      </div>
    )
  }
  if (!selection.offer || !selection.state) {
    return (
      <div className="equipment-selection equipment-selection-error">
        <p>{selection.error ?? 'No loadout available.'}</p>
        <OnboardingBackButton onBack={props.onBack} />
      </div>
    )
  }

  return (
    <EquipmentSelectionForm
      offer={selection.offer}
      state={selection.state}
      setState={selection.setState}
      submitting={selection.submitting}
      error={selection.error}
      onConfirm={() => void selection.confirm(props.onComplete)}
      onBack={props.onBack}
    />
  )
}
