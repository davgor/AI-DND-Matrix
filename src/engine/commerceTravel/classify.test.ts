import { describe, expect, it } from 'vitest'
import { classifyCommerceIntent, classifyTravelIntent } from './classify'

const CATALOG = [
  { id: 'd1', name: 'Dagger' },
  { id: 's1', name: 'Longsword' },
  { id: 'r1', name: 'Rope' }
]

const REGIONS = [
  { id: 'reg1', name: 'Market Square' },
  { id: 'reg2', name: 'Oakhollow' }
]

describe('classifyCommerceIntent', () => {
  it('classifies buy with catalog match', () => {
    expect(classifyCommerceIntent('I buy a dagger', CATALOG)).toEqual({
      op: 'buy',
      itemNameHint: 'Dagger',
      catalogItemId: 'd1'
    })
  })

  it('classifies sell and trade-for', () => {
    expect(classifyCommerceIntent('I sell my Longsword', CATALOG)?.op).toBe('sell')
    expect(classifyCommerceIntent('I trade for the rope', CATALOG)).toMatchObject({
      op: 'trade',
      catalogItemId: 'r1'
    })
  })

  it('keeps unknown item hint without inventing an id', () => {
    expect(classifyCommerceIntent('I buy a vorpal blade', CATALOG)).toEqual({
      op: 'buy',
      itemNameHint: 'vorpal blade',
      catalogItemId: undefined
    })
  })

  it('returns null for non-commerce lines', () => {
    expect(classifyCommerceIntent('Hello there', CATALOG)).toBeNull()
  })
})

describe('classifyTravelIntent', () => {
  it('classifies travel to a known region', () => {
    expect(classifyTravelIntent('I travel to Oakhollow', REGIONS)).toEqual({
      destinationNameHint: 'Oakhollow',
      estimatedDays: 1,
      regionId: 'reg2'
    })
  })

  it('keeps unknown destination without inventing a region id', () => {
    expect(classifyTravelIntent('We head to Nowherevale', REGIONS)).toEqual({
      destinationNameHint: 'Nowherevale',
      estimatedDays: 1,
      regionId: undefined
    })
  })

  it('returns null when travel cue is absent', () => {
    expect(classifyTravelIntent('I buy a dagger', REGIONS)).toBeNull()
  })

  it('does not invent a region for local landmark cues', () => {
    expect(classifyTravelIntent('I head to the well for water', REGIONS)).toEqual({
      destinationNameHint: 'well for water',
      estimatedDays: 1,
      regionId: undefined
    })
  })
})
