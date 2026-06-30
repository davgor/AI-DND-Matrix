import { describe, expect, it } from 'vitest'
import {
  campaignPlayBlockerMessage,
  canEnterCampaignPlay,
  getCampaignPlayBlockers
} from './campaignPlayReady'

describe('getCampaignPlayBlockers', () => {
  it('flags regions with zero NPCs', () => {
    const blockers = getCampaignPlayBlockers({
      regions: [
        { id: 'r1', name: 'Oakhollow' } as never,
        { id: 'r2', name: 'Mistfen' } as never
      ],
      npcs: [{ id: 'n1', regionId: 'r1' } as never]
    })
    expect(blockers).toHaveLength(1)
    expect(blockers[0]?.regionName).toBe('Mistfen')
  })

  it('returns no blockers when every region has NPCs', () => {
    expect(
      getCampaignPlayBlockers({
        regions: [{ id: 'r1', name: 'Oakhollow' } as never],
        npcs: [{ id: 'n1', regionId: 'r1' } as never]
      })
    ).toEqual([])
  })

  it('returns no blockers for zero regions', () => {
    expect(getCampaignPlayBlockers({ regions: [], npcs: [] })).toEqual([])
  })
})

describe('canEnterCampaignPlay', () => {
  it('blocks when any region lacks NPCs', () => {
    expect(
      canEnterCampaignPlay({
        regions: [{ id: 'r1', name: 'A' } as never],
        npcs: []
      })
    ).toBe(false)
  })
})

describe('campaignPlayBlockerMessage', () => {
  it('names empty regions in the message', () => {
    const message = campaignPlayBlockerMessage([
      { kind: 'empty-region', regionId: 'r2', regionName: 'Mistfen' }
    ])
    expect(message).toMatch(/Mistfen/)
  })
})
