import { useState } from 'react'
import { STARTING_OFF_HAND_EMPTY } from '../../../engine/startingLoadout/packages'
import { canConfirmEquipmentSelection, type EquipmentSelectionState } from './equipmentSelectionLogic'
import type { StartingLoadoutOffer } from '../../../shared/startingLoadout/types'

export function useSubmitLoadout(
  characterId: string,
  offer: StartingLoadoutOffer | null,
  state: EquipmentSelectionState | null,
  setError: (value: string | null) => void
) {
  const [submitting, setSubmitting] = useState(false)

  async function submitLoadout(onComplete: () => void): Promise<void> {
    if (!offer || !state || !canConfirmEquipmentSelection(offer, state)) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await window.startingLoadout.apply({
        characterId,
        selections: {
          weaponName: state.weaponName!,
          armorName: state.armorName!,
          offHandChoice: state.offHandChoice ?? STARTING_OFF_HAND_EMPTY,
          spellKeys: state.spellKeys
        }
      })
      if (!result.ok) {
        setError('Could not save your equipment choices. Try again.')
        return
      }
      onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  return { submitting, submitLoadout }
}
