import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import {
  advanceInGameDate,
  createCampaign,
  getCampaignById,
  listCampaigns,
  updateCampaignStateSummary
} from './campaigns'

describe('campaigns repository: create + getById round-trip', () => {
  it('round-trips all fields, including null respawn_rules', () => {
    const db = createTestDb()

    const created = createCampaign(db, {
      name: 'The Sunken Crown',
      premisePrompt: 'A flooded kingdom hides an ancient throne.',
      deathMode: 'legendary',
      respawnRules: null
    })

    const fetched = getCampaignById(db, created.id)

    expect(fetched).toEqual(created)
    expect(fetched?.deathMode).toBe('legendary')
    expect(fetched?.respawnRules).toBeNull()
    expect(fetched?.inGameDate).toBe(0)
    expect(fetched?.currentStateSummary).toBe('')
  })

  it('round-trips a non-null respawn_rules object', () => {
    const db = createTestDb()

    const created = createCampaign(db, {
      name: 'Ashes of Velmora',
      premisePrompt: 'A burning empire.',
      deathMode: 'respawn',
      respawnRules: { location: 'Last Shrine', cost: 50, limit: 3 }
    })

    const fetched = getCampaignById(db, created.id)

    expect(fetched?.respawnRules).toEqual({ location: 'Last Shrine', cost: 50, limit: 3 })
  })

  it('returns undefined for an unknown id', () => {
    const db = createTestDb()
    expect(getCampaignById(db, 'does-not-exist')).toBeUndefined()
  })
})

describe('campaigns repository: listCampaigns', () => {
  it('orders campaigns most-recently-created first', () => {
    const db = createTestDb()

    const first = createCampaign(db, {
      name: 'First',
      premisePrompt: '...',
      deathMode: 'legendary',
      createdAt: '2026-01-01T00:00:00.000Z'
    })
    const second = createCampaign(db, {
      name: 'Second',
      premisePrompt: '...',
      deathMode: 'legendary',
      createdAt: '2026-01-02T00:00:00.000Z'
    })
    const third = createCampaign(db, {
      name: 'Third',
      premisePrompt: '...',
      deathMode: 'legendary',
      createdAt: '2026-01-03T00:00:00.000Z'
    })

    expect(listCampaigns(db).map((c) => c.id)).toEqual([third.id, second.id, first.id])
  })
})

describe('campaigns repository: updates', () => {
  it('updates current_state_summary', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'Test',
      premisePrompt: '...',
      deathMode: 'standard'
    })

    updateCampaignStateSummary(db, created.id, 'The party has reached the capital.')

    expect(getCampaignById(db, created.id)?.currentStateSummary).toBe(
      'The party has reached the capital.'
    )
  })

  it('advances in_game_date by a given number of days and persists it', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'Test',
      premisePrompt: '...',
      deathMode: 'standard'
    })

    const afterFirst = advanceInGameDate(db, created.id, 1)
    expect(afterFirst).toBe(1)

    const afterSecond = advanceInGameDate(db, created.id, 4)
    expect(afterSecond).toBe(5)

    expect(getCampaignById(db, created.id)?.inGameDate).toBe(5)
  })
})
