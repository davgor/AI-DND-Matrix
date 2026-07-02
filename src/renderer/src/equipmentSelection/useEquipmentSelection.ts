import { useLoadoutOffer } from './useLoadoutOffer'
import { useSubmitLoadout } from './useSubmitLoadout'

export function useEquipmentSelection(characterId: string) {
  const loaded = useLoadoutOffer(characterId)
  const submit = useSubmitLoadout(characterId, loaded.offer, loaded.state, loaded.setError)

  return {
    offer: loaded.offer,
    state: loaded.state,
    setState: loaded.setState,
    loading: loaded.loading,
    submitting: submit.submitting,
    error: loaded.error,
    confirm: submit.submitLoadout
  }
}
