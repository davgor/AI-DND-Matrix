import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { listEventsByCampaign } from '../db/repositories/events'
import { createNpc, getNpcById } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from './turnIpc'

function fixedRng(value: number) {
  return () => value
}

function seedCampaignWithPlayer() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: '...' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    hp: 20,
    level: 1,
    currency: 100,
    stats: { abilityScores: { body: 12, agility: 14, mind: 10, presence: 10 }, ac: 12 }
  })
  return { db, campaign, region, player }
}

describe('resolvePlayerTurn: rest and travel branches', () => {
  it('resolves a short rest without calling the narration step', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    const provider = createScriptedProvider(['{"checkNeeded":false,"actionType":"restShort"}'])
    db.prepare('UPDATE characters SET hp = ? WHERE id = ?').run(5, player.id)

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I catch my breath' },
      fixedRng(0.5)
    )

    expect(provider.calls).toHaveLength(1)
    expect(result.hpAfter).toBeGreaterThan(5)
    expect(result.check).toBeUndefined()
  })

  it('resolves a travel action, clamping the estimate and advancing in-game date', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    const provider = createScriptedProvider(['{"checkNeeded":false,"actionType":"travel","travelDays":90}'])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'We travel far' },
      fixedRng(0.5)
    )

    expect(result.inGameDateAfter).toBe(30)
    expect(result.narrationText).toContain('30 days')
  })
})

describe('resolvePlayerTurn: standard check turn', () => {
  it('rolls a check, narrates the outcome, and persists the player_action event', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    const provider = createScriptedProvider([
      '{"checkNeeded":true,"ability":"agility","dc":10,"proficient":false}',
      '{"narrationText":"You slip past unseen."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I sneak past the guard' },
      fixedRng(0.5)
    )

    expect(result.check).toBeDefined()
    expect(result.narrationText).toBe('You slip past unseen.')
    const events = listEventsByCampaign(db, campaign.id, { type: 'player_action' })
    expect(events).toHaveLength(1)
  })
})

describe('resolvePlayerTurn: NPC reactions and combat', () => {
  it('generates a reacting NPC and applies a hit that can drop the player to 0 HP', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Bandit',
      role: 'enemy',
      disposition: 'hostile'
    })
    db.prepare('UPDATE characters SET hp = 10 WHERE id = ?').run(player.id)
    const provider = createScriptedProvider([
      '{"checkNeeded":false}',
      `{"narrationText":"The bandit lunges.","reactingNpcIds":["${npc.id}"]}`,
      '{"dialogue":"Die!","attack":true}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I taunt the bandit' },
      fixedRng(0.99)
    )

    expect(result.npcReactions).toHaveLength(1)
    expect(result.npcReactions[0]?.attackResult?.hit).toBe(true)
    const reloaded = getCharacterById(db, player.id)
    expect(reloaded).toBeDefined()
    expect(reloaded?.hp).toBe(0)
    expect((reloaded!.stats as { dyingState?: unknown }).dyingState).toBeDefined()
  })
})

describe('resolvePlayerTurn: NPC promotion proposal (011.1)', () => {
  it('surfaces a proposed NPC promotion with the NPC name, without applying it', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'shopkeeper',
      disposition: 'friendly'
    })
    const provider = createScriptedProvider([
      '{"checkNeeded":false}',
      `{"narrationText":"Mira considers your offer.","proposedPromotionNpcId":"${npc.id}"}`
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'Join us, Mira!' },
      fixedRng(0.5)
    )

    expect(result.proposedPromotion).toEqual({ npcId: npc.id, npcName: 'Mira' })
    expect(getNpcById(db, npc.id)?.isPartyMember).toBe(false)
  })
})

describe('resolvePlayerTurn: AI party member autonomous actions', () => {
  it('generates an action for each AI party member without player direction', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    createCharacter(db, {
      campaignId: campaign.id,
      name: 'Brom',
      characterClass: 'ranger',
      kind: 'ai_party_member',
      stats: { personality: 'gruff' }
    })
    const provider = createScriptedProvider([
      '{"checkNeeded":false}',
      '{"narrationText":"Nothing much happens."}',
      '{"actionText":"Brom scouts ahead."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I look around' },
      fixedRng(0.5)
    )

    expect(result.partyMemberActions).toEqual([{ characterId: expect.any(String), name: 'Brom', actionText: 'Brom scouts ahead.' }])
  })
})

describe('resolvePlayerTurn: dying-sequence short-circuit', () => {
  it('progresses the dying sequence before processing new input, without calling the provider', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    db.prepare("UPDATE characters SET hp = 0, stats = json_set(stats, '$.dyingState', json('{\"unconscious\":true,\"successStreak\":0,\"failureStreak\":0,\"stabilized\":false,\"lost\":false}')) WHERE id = ?").run(player.id)
    const provider = createScriptedProvider([])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'anything' },
      fixedRng(0.99)
    )

    expect(provider.calls).toHaveLength(0)
    expect(result.dyingResolution).toBeDefined()
  })
})
