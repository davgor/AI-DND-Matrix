import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign, getCampaignById } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from './turnIpc'

// EPIC-133 — watermark advances on play / rest / travel
function seedCampaignWithPlayer() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Shared Time',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: '...'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Alice',
    characterClass: 'fighter',
    kind: 'player',
    guidedCreationPhase: 'complete',
    hp: 20,
    stats: {
      abilityScores: { body: 12, agility: 14, mind: 10, presence: 10 },
      ac: 12,
      maxHp: 20,
      hitDieRolls: [10],
      currentRegionId: region.id
    }
  })
  return { db, campaign, player }
}

function fixedRng(): () => number {
  return () => 0.5
}

describe('shared-time watermark on turn resolve (133.2)', () => {
  it('updates watermark after travel advances the campaign clock', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    const provider = createScriptedProvider([
      JSON.stringify({ intent: { checkNeeded: false, actionType: 'travel', travelDays: 3 } })
    ])

    const result = await resolvePlayerTurn(
      db, 
      provider, 
      { campaignId: campaign.id, characterId: player.id, playerInput: 'We travel' }, { rng: fixedRng() })

    expect(result.inGameDateAfter).toBe(3)
    expect(getCampaignById(db, campaign.id)?.inGameDate).toBe(3)
    expect(getCharacterById(db, player.id)?.lastActiveInGameDate).toBe(3)
  })

  it('updates watermark after long rest advances the campaign clock', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    const provider = createScriptedProvider([
      JSON.stringify({ intent: { checkNeeded: false, actionType: 'restLong' } })
    ])
    db.prepare('UPDATE characters SET hp = ? WHERE id = ?').run(5, player.id)

    const result = await resolvePlayerTurn(
      db, 
      provider, 
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I sleep' }, { rng: fixedRng() })

    expect(result.inGameDateAfter).toBe(1)
    expect(getCharacterById(db, player.id)?.lastActiveInGameDate).toBe(1)
  })

  it('updates watermark on short rest even when the clock does not move', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    db.prepare('UPDATE campaigns SET in_game_date = ? WHERE id = ?').run(7, campaign.id)
    const provider = createScriptedProvider([
      JSON.stringify({ intent: { checkNeeded: false, actionType: 'restShort' } })
    ])
    db.prepare('UPDATE characters SET hp = ? WHERE id = ?').run(5, player.id)

    await resolvePlayerTurn(
      db, 
      provider, 
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I catch my breath' }, { rng: fixedRng() })

    expect(getCampaignById(db, campaign.id)?.inGameDate).toBe(7)
    expect(getCharacterById(db, player.id)?.lastActiveInGameDate).toBe(7)
  })
})
