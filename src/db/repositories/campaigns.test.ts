import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { touchLastPlayed } from './sessions'
import {
  advanceInGameDate,
  createCampaign,
  getCampaignById,
  listCampaignsByLastPlayed,
  updateCampaignDeathMode,
  updateCampaignStateSummary,
  updateCampaignWorldHistory,
  updateCampaignWorldSummary,
  updateCampaignPantheonSummary,
  updateCampaignNpcFaceTokenGenerationEnabled,
  updateCampaignEnemyTokenGenerationEnabled
} from './campaigns'

function expectDefaultCampaignFields(
  fetched: ReturnType<typeof getCampaignById>,
  created: ReturnType<typeof createCampaign>
): void {
  expect(fetched).toEqual(created)
  expect(fetched?.deathMode).toBe('legendary')
  expect(fetched?.respawnRules).toBeNull()
  expectEmptyCampaignWorldFields(fetched)
}

function expectEmptyCampaignWorldFields(
  fetched: ReturnType<typeof getCampaignById>
): void {
  expect(fetched?.inGameDate).toBe(0)
  expect(fetched?.currentStateSummary).toBe('')
  expect(fetched?.worldName).toBe('')
  expect(fetched?.worldSummary).toBe('')
  expect(fetched?.worldHistory).toBe('')
  expect(fetched?.pantheonSummary).toBe('')
  expect(fetched?.npcFaceTokenGenerationEnabled).toBe(false)
  expect(fetched?.enemyTokenGenerationEnabled).toBe(false)
}

describe('campaigns repository: create + getById round-trip', () => {
  it('round-trips all fields, including null respawn_rules', () => {
    const db = createTestDb()

    const created = createCampaign(db, {
      name: 'The Sunken Crown',
      premisePrompt: 'A flooded kingdom hides an ancient throne.',
      deathMode: 'legendary',
      respawnRules: null
    })

    expectDefaultCampaignFields(getCampaignById(db, created.id), created)
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

describe('campaigns repository: npcFaceTokenGenerationEnabled', () => {
  it('defaults to false when omitted at create', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'No Tokens',
      premisePrompt: '...',
      deathMode: 'standard'
    })
    expect(created.npcFaceTokenGenerationEnabled).toBe(false)
    expect(getCampaignById(db, created.id)?.npcFaceTokenGenerationEnabled).toBe(false)
  })

  it('persists when set at create', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'With Tokens',
      premisePrompt: '...',
      deathMode: 'standard',
      npcFaceTokenGenerationEnabled: true
    })
    expect(created.npcFaceTokenGenerationEnabled).toBe(true)
    expect(getCampaignById(db, created.id)?.npcFaceTokenGenerationEnabled).toBe(true)
  })
})

describe('campaigns repository: listCampaignsByLastPlayed', () => {
  it('orders by last-played, falling back to created_at for never-played campaigns', () => {
    const db = createTestDb()

    const neverPlayed = createCampaign(db, {
      name: 'Never Played',
      premisePrompt: '...',
      deathMode: 'legendary',
      createdAt: '2026-01-01T00:00:00.000Z'
    })
    const playedLongAgo = createCampaign(db, {
      name: 'Played Long Ago',
      premisePrompt: '...',
      deathMode: 'legendary',
      createdAt: '2026-01-02T00:00:00.000Z'
    })
    const playedRecently = createCampaign(db, {
      name: 'Played Recently',
      premisePrompt: '...',
      deathMode: 'legendary',
      createdAt: '2025-01-01T00:00:00.000Z'
    })

    touchLastPlayed(db, playedLongAgo.id, '2026-01-03T00:00:00.000Z')
    touchLastPlayed(db, playedRecently.id, '2026-06-01T00:00:00.000Z')

    const result = listCampaignsByLastPlayed(db)

    expect(result.map((c) => c.id)).toEqual([playedRecently.id, playedLongAgo.id, neverPlayed.id])
    expect(result.find((c) => c.id === neverPlayed.id)?.lastPlayedAt).toBeNull()
    expect(result.find((c) => c.id === playedRecently.id)?.lastPlayedAt).toBe(
      '2026-06-01T00:00:00.000Z'
    )
  })
})

describe('campaigns repository: world fields at create', () => {
  it('round-trips world fields when provided at create', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'Velmora',
      premisePrompt: 'A storm-wracked archipelago.',
      deathMode: 'standard',
      worldName: 'The Shattered Expanse',
      worldSummary: 'Para one.\n\nPara two.\n\nPara three.',
      worldHistory: 'Epoch one.\n\nEpoch two.\n\nEpoch three.\n\nEpoch four.'
    })

    expect(getCampaignById(db, created.id)).toEqual(created)
  })
})

describe('campaigns repository: world field updates', () => {
  it('updates world_summary and world_history independently', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'Test',
      premisePrompt: '...',
      deathMode: 'standard'
    })

    updateCampaignWorldSummary(db, created.id, 'New summary.\n\nSecond.\n\nThird.')
    updateCampaignWorldHistory(db, created.id, 'Deep past.\n\nMore past.\n\nLegends.\n\nRecent epochs.')

    const fetched = getCampaignById(db, created.id)
    expect(fetched?.worldSummary).toContain('New summary')
    expect(fetched?.worldHistory).toContain('Deep past')
  })
})

describe('campaigns repository: pantheon summary', () => {
  it('round-trips pantheonSummary at create and via update helper', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'Test',
      premisePrompt: '...',
      deathMode: 'standard',
      pantheonSummary: 'Gods of tide and ash still argue over drowned crowns.'
    })
    expect(getCampaignById(db, created.id)?.pantheonSummary).toContain('tide and ash')

    updateCampaignPantheonSummary(db, created.id, 'A quieter faith remains in ruin chapels.')
    expect(getCampaignById(db, created.id)?.pantheonSummary).toContain('ruin chapels')
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

describe('campaigns repository: updateCampaignNpcFaceTokenGenerationEnabled', () => {
  it('toggles the face-token generation flag', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'Test',
      premisePrompt: '...',
      deathMode: 'standard'
    })
    expect(getCampaignById(db, created.id)?.npcFaceTokenGenerationEnabled).toBe(false)

    updateCampaignNpcFaceTokenGenerationEnabled(db, created.id, true)
    expect(getCampaignById(db, created.id)?.npcFaceTokenGenerationEnabled).toBe(true)

    updateCampaignNpcFaceTokenGenerationEnabled(db, created.id, false)
    expect(getCampaignById(db, created.id)?.npcFaceTokenGenerationEnabled).toBe(false)
  })
})

describe('campaigns repository: enemyTokenGenerationEnabled', () => {
  it('defaults to false when omitted at create', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'No Enemy Tokens',
      premisePrompt: '...',
      deathMode: 'standard'
    })
    expect(created.enemyTokenGenerationEnabled).toBe(false)
    expect(getCampaignById(db, created.id)?.enemyTokenGenerationEnabled).toBe(false)
  })

  it('persists when set at create', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'With Enemy Tokens',
      premisePrompt: '...',
      deathMode: 'standard',
      enemyTokenGenerationEnabled: true
    })
    expect(created.enemyTokenGenerationEnabled).toBe(true)
    expect(getCampaignById(db, created.id)?.enemyTokenGenerationEnabled).toBe(true)
  })
})

describe('campaigns repository: updateCampaignEnemyTokenGenerationEnabled', () => {
  it('toggles the enemy-token generation flag', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'Test',
      premisePrompt: '...',
      deathMode: 'standard'
    })
    expect(getCampaignById(db, created.id)?.enemyTokenGenerationEnabled).toBe(false)

    updateCampaignEnemyTokenGenerationEnabled(db, created.id, true)
    expect(getCampaignById(db, created.id)?.enemyTokenGenerationEnabled).toBe(true)

    updateCampaignEnemyTokenGenerationEnabled(db, created.id, false)
    expect(getCampaignById(db, created.id)?.enemyTokenGenerationEnabled).toBe(false)
  })
})

describe('campaigns repository: updateCampaignDeathMode', () => {
  it('switches death mode and clears respawn rules when not provided', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'Test',
      premisePrompt: '...',
      deathMode: 'legendary'
    })

    updateCampaignDeathMode(db, created.id, { deathMode: 'standard' })

    const updated = getCampaignById(db, created.id)
    expect(updated?.deathMode).toBe('standard')
    expect(updated?.respawnRules).toBeNull()
  })

  it('persists respawn rules when death mode is respawn', () => {
    const db = createTestDb()
    const created = createCampaign(db, {
      name: 'Test',
      premisePrompt: '...',
      deathMode: 'legendary'
    })

    updateCampaignDeathMode(db, created.id, {
      deathMode: 'respawn',
      respawnRules: { location: 'Last Shrine', cost: 50, limit: 3 }
    })

    const updated = getCampaignById(db, created.id)
    expect(updated?.deathMode).toBe('respawn')
    expect(updated?.respawnRules).toEqual({ location: 'Last Shrine', cost: 50, limit: 3 })
  })
})
