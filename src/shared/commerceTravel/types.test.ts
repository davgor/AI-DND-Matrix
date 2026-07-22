import { describe, expect, it } from 'vitest'
import {
  COMMERCE_FAIL_CODES,
  COMMERCE_OPS,
  COMMERCE_TRAVEL_NON_GOALS,
  TRAVEL_FAIL_CODES,
  isCommerceFailCode,
  isCommerceOp,
  isTravelFailCode
} from './types'
import {
  commerceFailMessage,
  formatCommerceFeedback,
  formatTravelFeedback,
  travelFailMessage
} from './feedback'

describe('commerceTravel shared types (135.1)', () => {
  it('exposes ops, fail codes, and non-goals including no shop UI', () => {
    expect(COMMERCE_OPS).toEqual(['buy', 'sell', 'trade'])
    expect(COMMERCE_FAIL_CODES).toContain('insufficient_funds')
    expect(COMMERCE_FAIL_CODES).toContain('unknown_item')
    expect(TRAVEL_FAIL_CODES).toContain('unknown_destination')
    expect(COMMERCE_TRAVEL_NON_GOALS.some((line) => /shop UI/i.test(line))).toBe(true)
    expect(isCommerceOp('buy')).toBe(true)
    expect(isCommerceOp('loot')).toBe(false)
    expect(isCommerceFailCode('not_owned')).toBe(true)
    expect(isTravelFailCode('already_here')).toBe(true)
  })

  it('formats fail copy for broke and unknown item/destination', () => {
    expect(commerceFailMessage('insufficient_funds', 'Longsword')).toMatch(/cannot afford/i)
    expect(commerceFailMessage('unknown_item', 'vorpal blade')).toMatch(/No known item/i)
    expect(travelFailMessage('unknown_destination', 'Nowhere')).toMatch(/No known destination/i)
  })

  it('formats success without requiring DM prose', () => {
    expect(
      formatCommerceFeedback({
        ok: true,
        op: 'buy',
        catalogItemId: 'i1',
        itemName: 'Dagger',
        price: 15,
        newBalance: 85
      })
    ).toMatch(/Bought Dagger/)
    expect(
      formatTravelFeedback({
        ok: true,
        regionId: 'r1',
        regionName: 'Oakhollow',
        daysAdvanced: 2,
        inGameDateAfter: 5
      })
    ).toMatch(/Traveled to Oakhollow/)
  })
})
