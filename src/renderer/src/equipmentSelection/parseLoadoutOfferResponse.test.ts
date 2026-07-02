import { describe, expect, it } from 'vitest'
import type { StartingLoadoutOffer } from '../../../shared/startingLoadout/types'
import { loadoutOfferErrorMessage, parseLoadoutOfferResponse } from './parseLoadoutOfferResponse'

const sampleOffer: StartingLoadoutOffer = {
  archetype: 'fighter',
  weapons: [{ name: 'Longsword', description: 'sword' }],
  armors: [{ name: 'Chain Hauberk', description: 'mail' }],
  offHand: [],
  spells: [],
  spellPickCount: 1
}

describe('parseLoadoutOfferResponse', () => {
  it('accepts wrapped ok responses', () => {
    expect(parseLoadoutOfferResponse({ ok: true, offer: sampleOffer })).toEqual({
      ok: true,
      offer: sampleOffer
    })
  })

  it('accepts legacy unwrapped offer objects', () => {
    expect(parseLoadoutOfferResponse(sampleOffer)).toEqual({ ok: true, offer: sampleOffer })
  })

  it('maps offer_unavailable with missing catalog entries', () => {
    const message = loadoutOfferErrorMessage({
      ok: false,
      reason: 'offer_unavailable',
      missingItems: ['Mace'],
      missingSpells: ['sacred-flame']
    })
    expect(message).toContain('Mace')
    expect(message).toContain('sacred-flame')
  })
})
