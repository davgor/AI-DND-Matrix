import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { listEventsByCampaign } from '../db/repositories/events'
import { createNpc, getNpcById } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from './turnIpc'
import { buildNarrationLog } from './narrationLog'

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
    stats: { abilityScores: { body: 12, agility: 14, mind: 10, presence: 10 }, ac: 12, maxHp: 20, hitDieRolls: [10] }
  })
  return { db, campaign, region, player }
}

function routingPlan(...beats: object[]) {
  return JSON.stringify({ disposition: 'composite', beats })
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
    expect(result.pendingAlignmentShift).toBeNull()
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
    expect(result.pendingAlignmentShift).toBeNull()
  })
})

describe('resolvePlayerTurn: narrated check turn', () => {
  it('rolls a check, narrates when the plan includes dmNarration, and persists events', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    const provider = createScriptedProvider([
      '{"checkNeeded":true,"ability":"agility","dc":10,"proficient":false}',
      routingPlan({ kind: 'dmNarration' }),
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
    const audit = listEventsByCampaign(db, campaign.id, { type: 'player_action' })
    expect(audit.some((event) => event.payload['auditOnly'] === true)).toBe(true)
  })
})

describe('resolvePlayerTurn: converse-only routing', () => {
  it('skips narration when the routing plan omits dmNarration', async () => {
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
      routingPlan({ kind: 'npcResponse', npcIds: [npc.id] }),
      '{"dialogue":"What do you need?"}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'Hello Mira' },
      fixedRng(0.5)
    )

    expect(result.narrationText).toBe('')
    expect(result.npcReactions[0]?.text).toBe('What do you need?')
    expect(provider.calls).toHaveLength(3)
  })
})

describe('resolvePlayerTurn: player action expression', () => {
  it('expresses a player physical action as bold prose when the plan includes playerActionExpression', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    const provider = createScriptedProvider([
      '{"checkNeeded":false}',
      routingPlan({
        kind: 'playerActionExpression',
        actionDescription: 'Kael draws his sword.'
      })
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I draw my sword' },
      fixedRng(0.5)
    )

    expect(result.playerActionText).toBe('Kael draws his sword.')
    const expressionEvents = listEventsByCampaign(db, campaign.id, { type: 'player_action_expression' })
    expect(expressionEvents[0]?.payload['playerInput']).toBe('I draw my sword')
  })
})

describe('resolvePlayerTurn: targeted NPC combat', () => {
  it('generates a targeted NPC from the routing plan and applies a hit', async () => {
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
      routingPlan({ kind: 'npcResponse', npcIds: [npc.id] }),
      '{"dialogue":"Die!","attack":true}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I taunt the bandit' },
      fixedRng(0.99)
    )

    expect(result.npcReactions[0]?.attackResult?.hit).toBe(true)
    expect(getCharacterById(db, player.id)?.hp).toBe(0)
  })
})

describe('resolvePlayerTurn: non-speaking creature actions', () => {
  it('renders non-speaking creature actions from the routing plan', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    const wolf = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Wolf',
      role: 'beast',
      disposition: 'hostile',
      canSpeak: false
    })
    const provider = createScriptedProvider([
      '{"checkNeeded":false}',
      routingPlan({ kind: 'npcResponse', npcIds: [wolf.id] }),
      JSON.stringify({ actionDescription: '**The wolf lunges.**' })
    ])

    await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I approach' },
      fixedRng(0.5)
    )

    const actionLine = buildNarrationLog(db, campaign.id).find((entry) => entry.reactionKind === 'action')
    expect(actionLine?.text).toBe('The wolf lunges.')
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
      routingPlan({ kind: 'dmNarration' }),
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

describe('resolvePlayerTurn: party member on narration turn', () => {
  it('runs party members when the plan includes a partyMember beat', async () => {
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
      routingPlan({ kind: 'dmNarration' }, { kind: 'partyMember' }),
      '{"narrationText":"Nothing much happens."}',
      '{"actionText":"Brom scouts ahead."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I look around' },
      fixedRng(0.5)
    )

    expect(result.partyMemberActions[0]?.actionText).toBe('Brom scouts ahead.')
  })
})

describe('resolvePlayerTurn: party silent on dialogue', () => {
  it('skips party members on converse-only NPC turns', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'guard',
      disposition: 'friendly'
    })
    createCharacter(db, {
      campaignId: campaign.id,
      name: 'Brom',
      characterClass: 'ranger',
      kind: 'ai_party_member'
    })
    const provider = createScriptedProvider([
      '{"checkNeeded":false}',
      routingPlan({ kind: 'npcResponse', npcIds: [npc.id] }),
      '{"dialogue":"Evening."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'Good evening' },
      fixedRng(0.5)
    )

    expect(result.partyMemberActions).toHaveLength(0)
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
