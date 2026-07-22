import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { advanceInGameDate, createCampaign } from '../db/repositories/campaigns'
import {
  createCharacter,
  touchCharacterLastActiveInGameDate
} from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from './providers/mockHarness'
import {
  assembleInactivePlayerContext,
  decideInactivePlayerAction
} from './inactivePlayer'
import { loadNarrationContextFields } from './narrationContextFields'
import { formatSharedTimeGrounding } from '../shared/sharedTime'

// EPIC-133 — shared clock grounding for DM + inactive proxy
function seedTwoPlayers() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Shared Time',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Crossroads',
    description: 'Where paths meet.'
  })
  const active = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    stats: { currentRegionId: region.id }
  })
  const inactive = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Lyra',
    characterClass: 'mage',
    kind: 'player',
    stats: { currentRegionId: region.id }
  })
  return { db, campaign, region, active, inactive }
}

describe('narration shared-time grounding (133.3)', () => {
  it('includes shared world day on narration context fields', () => {
    const { db, campaign, region, active } = seedTwoPlayers()
    advanceInGameDate(db, campaign.id, 9)
    const fields = loadNarrationContextFields(db, {
      campaignId: campaign.id,
      regionId: region.id,
      characterId: active.id
    })
    expect(fields.sharedWorldDay).toBe(9)
    expect(fields.sharedTimeGrounding).toContain('World day 9')
    expect(fields.sharedTimeGrounding?.toLowerCase()).toContain('private calendar')
  })
})

describe('inactive proxy shared-time grounding (133.3)', () => {
  it('includes world day, watermark gap, and forbids private calendars', () => {
    const { db, campaign, inactive } = seedTwoPlayers()
    advanceInGameDate(db, campaign.id, 12)
    touchCharacterLastActiveInGameDate(db, inactive.id, 9)

    const context = assembleInactivePlayerContext(db, inactive.id, campaign.id)
    expect(context.sharedWorldDay).toBe(12)
    expect(context.lastActiveInGameDate).toBe(9)
    expect(context.awayDays).toBe(3)
    expect(context.sharedTimeGrounding).toBe(
      formatSharedTimeGrounding({ worldDay: 12, lastActiveInGameDate: 9 })
    )
    expect(context.sharedTimeGrounding.toLowerCase()).toContain('private calendar')
  })

  it('puts shared-time grounding into the inactive proxy prompt', async () => {
    const { db, campaign, inactive } = seedTwoPlayers()
    advanceInGameDate(db, campaign.id, 5)
    touchCharacterLastActiveInGameDate(db, inactive.id, 2)
    const provider = createScriptedProvider(['{"actionText":"Lyra nods."}'])
    const context = assembleInactivePlayerContext(db, inactive.id, campaign.id)

    await decideInactivePlayerAction(provider, inactive, context, 'Kael approaches.')

    const prompt = provider.calls[0]!.prompt
    expect(prompt).toContain('World day 5')
    expect(prompt.toLowerCase()).toContain('private calendar')
    expect(prompt).not.toContain('your personal calendar')
  })
})
