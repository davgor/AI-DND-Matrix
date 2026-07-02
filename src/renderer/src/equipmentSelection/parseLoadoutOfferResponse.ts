import type { StartingLoadoutOffer } from '../../../shared/startingLoadout/types'

type LoadoutOfferResponse =
  | { ok: true; offer: StartingLoadoutOffer }
  | {
      ok: false
      reason: string
      missingItems?: string[]
      missingSpells?: string[]
    }

function isStartingLoadoutOffer(value: object): value is StartingLoadoutOffer {
  return 'archetype' in value && 'weapons' in value && 'spellPickCount' in value
}

export function parseLoadoutOfferResponse(result: unknown): LoadoutOfferResponse {
  if (!result || typeof result !== 'object') {
    return { ok: false, reason: 'invalid_response' }
  }
  if ('ok' in result) {
    return result as LoadoutOfferResponse
  }
  if (isStartingLoadoutOffer(result)) {
    return { ok: true, offer: result }
  }
  return { ok: false, reason: 'invalid_response' }
}

export function loadoutOfferErrorMessage(result: Extract<LoadoutOfferResponse, { ok: false }>): string {
  if (result.reason === 'not_found') {
    return 'Character not found. Try reloading the campaign.'
  }
  if (result.reason === 'offer_unavailable') {
    const missing = [...(result.missingItems ?? []), ...(result.missingSpells ?? [])]
    if (missing.length > 0) {
      return `Missing catalog entries: ${missing.join(', ')}. Restart the app to refresh seeded content.`
    }
    return 'Could not load equipment options for this archetype.'
  }
  if (result.reason === 'invalid_response') {
    return 'Equipment loading failed. Restart the app to pick up the latest build.'
  }
  return 'Could not load equipment options.'
}
