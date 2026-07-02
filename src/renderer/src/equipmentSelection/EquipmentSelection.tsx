import { EquipmentSelectionForm } from './EquipmentSelectionForm'
import { EquipmentBackButton } from './EquipmentBackButton'
import { useEquipmentSelection } from './useEquipmentSelection'
export interface EquipmentSelectionProps {
  characterId: string
  characterName: string
  onComplete: () => void
  onBack: () => void
}

export function EquipmentSelection(props: EquipmentSelectionProps): JSX.Element {
  const selection = useEquipmentSelection(props.characterId)

  if (selection.loading) {
    return (
      <div className="equipment-selection equipment-selection-loading">
        <p>Loading gear options...</p>
        <EquipmentBackButton onBack={props.onBack} />
      </div>
    )
  }
  if (!selection.offer || !selection.state) {
    return (
      <div className="equipment-selection equipment-selection-error">
        <p>{selection.error ?? 'No loadout available.'}</p>
        <EquipmentBackButton onBack={props.onBack} />
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
