import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { buildLevelSpanContext, spanStartXpBoundaries } from './levelSpanContext'

describe('buildLevelSpanContext combat fixture', () => {
  it('produces high combat tag counts for combat fixture', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 't', deathMode: 'standard' })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Fighter',
      characterClass: 'fighter',
      kind: 'player',
      level: 1
    })
    for (let i = 0; i < 4; i += 1) {
      appendEvent(db, {
        campaignId: campaign.id,
        type: 'combat_attack',
        payload: { characterId: hero.id, activityTag: 'combat' }
      })
    }
    const ctx = buildLevelSpanContext({
      db,
      campaignId: campaign.id,
      characterId: hero.id,
      archetype: 'fighter',
      newLevel: 2,
      spanStartXp: 0
    })
    expect(ctx.activityTags.combat).toBeGreaterThanOrEqual(4)
  })
})

describe('spanStartXpBoundaries', () => {
  it('partitions span boundaries for multi-level gain', () => {
    const ceremonies = spanStartXpBoundaries(1, 3, 0)
    expect(ceremonies).toHaveLength(2)
    expect(ceremonies[0]?.targetLevel).toBe(2)
    expect(ceremonies[1]?.targetLevel).toBe(3)
    expect(ceremonies[1]?.spanStartXp).toBe(300)
  })
})
