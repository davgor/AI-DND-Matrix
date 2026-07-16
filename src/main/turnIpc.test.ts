import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { listEventsByCampaign } from '../db/repositories/events'
import { createNpc, getNpcById } from '../db/repositories/npcs'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { hasCrossCharacterSignal, resolvePlayerTurn, updateBeatSceneContext } from './turnIpc'
import { buildNarrationLog } from './narrationLog'
import { SCENE_CONTEXT_MAX_CHARS, capSceneContextForPrompt } from './sceneContextCap'
import type { TurnRoutingPlan } from '../shared/turnRouting/types'

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

// 040.2: intent + routing plan arrive from a single merged LLM response.
function mergedTurn(intent: object, ...beats: object[]) {
  return JSON.stringify({ intent, routingPlan: { disposition: 'composite', beats } })
}

describe('resolvePlayerTurn: rest and travel branches', () => {
  it('resolves a short rest without calling the narration step', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    const provider = createScriptedProvider([
      JSON.stringify({ intent: { checkNeeded: false, actionType: 'restShort' } })
    ])
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
    const provider = createScriptedProvider([
      JSON.stringify({ intent: { checkNeeded: false, actionType: 'travel', travelDays: 90 } })
    ])

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
      mergedTurn(
        { checkNeeded: true, ability: 'agility', dc: 10, proficient: false },
        { kind: 'dmNarration' }
      ),
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

  it('forces a dmNarration beat when a check-needed plan omits one, so the outcome is narrated', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    const provider = createScriptedProvider([
      mergedTurn(
        { checkNeeded: true, ability: 'agility', dc: 10, proficient: false },
        { kind: 'playerActionExpression', actionDescription: 'Kael picks the lock.' }
      ),
      '{"narrationText":"The lock clicks open."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I pick the lock' },
      fixedRng(0.5)
    )

    expect(result.check).toBeDefined()
    expect(result.playerActionText).toBe('Kael picks the lock.')
    expect(result.narrationText).toBe('The lock clicks open.')
  })
})

describe('resolvePlayerTurn: converse-only routing', () => {
  it('skips narration when the routing plan omits dmNarration, using one intent+routing call', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'shopkeeper',
      disposition: 'friendly'
    })
    const provider = createScriptedProvider([
      mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [npc.id] }),
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
    // one merged intent+routing call plus the NPC reaction — no separate review call
    expect(provider.calls).toHaveLength(2)
  })
})

describe('resolvePlayerTurn: player action expression (040.3 heuristic fast path)', () => {
  it('expresses an obvious physical action deterministically via the intent-only prompt', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    // The heuristic routes this turn, so only a bare intent response is needed.
    const provider = createScriptedProvider(['{"checkNeeded":false}'])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I draw my sword' },
      fixedRng(0.5)
    )

    expect(result.playerActionText).toBe('Kael draws their sword.')
    // the entire routed turn cost a single, intent-only LLM call
    // (040.9: schemas live in systemPrompt, so distinguish the call there)
    expect(provider.calls).toHaveLength(1)
    expect(provider.calls[0]?.context?.systemPrompt ?? '').not.toContain('routingPlan')
    const expressionEvents = listEventsByCampaign(db, campaign.id, { type: 'player_action_expression' })
    expect(expressionEvents[0]?.payload['playerInput']).toBe('I draw my sword')
  })

  it('still narrates a check outcome when the heuristic-routed intent needs a roll', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    const provider = createScriptedProvider([
      '{"checkNeeded":true,"ability":"agility","dc":10,"proficient":false}',
      '{"narrationText":"You steady yourself on the ledge."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I brace myself' },
      fixedRng(0.5)
    )

    expect(result.check).toBeDefined()
    expect(result.playerActionText).toBe('Kael braces themselves.')
    expect(result.narrationText).toBe('You steady yourself on the ledge.')
    expect(provider.calls[0]?.context?.systemPrompt ?? '').not.toContain('routingPlan')
  })
})

describe('resolvePlayerTurn: heuristic converse fast path (040.3)', () => {
  it('routes a repeat dialogue turn to the single present NPC without the routing LLM', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'shopkeeper',
      disposition: 'friendly'
    })
    // Prior memory: not a first interaction, so the starvation guard allows the fast path.
    appendNpcMemory(db, { npcId: npc.id, content: 'Kael greeted me yesterday.', tags: [] })
    const provider = createScriptedProvider([
      '{"checkNeeded":false}',
      '{"dialogue":"Back again so soon?"}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'Hello Mira' },
      fixedRng(0.5)
    )

    expect(result.narrationText).toBe('')
    expect(result.npcReactions[0]?.text).toBe('Back again so soon?')
    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[0]?.context?.systemPrompt ?? '').not.toContain('routingPlan')
  })

  it('defers a first interaction with an NPC to LLM routing (starvation guard)', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'shopkeeper',
      disposition: 'friendly'
    })
    const provider = createScriptedProvider([
      mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [npc.id] }),
      '{"dialogue":"Welcome, stranger."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'Hello Mira' },
      fixedRng(0.5)
    )

    expect(result.npcReactions[0]?.text).toBe('Welcome, stranger.')
    expect(provider.calls[0]?.context?.systemPrompt ?? '').toContain('routingPlan')
  })
})

describe('resolvePlayerTurn: composite turns fall through to LLM routing (040.3)', () => {
  it('keeps merged LLM routing for an action + check + NPC turn', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Bandit',
      role: 'enemy',
      disposition: 'hostile'
    })
    appendNpcMemory(db, { npcId: npc.id, content: 'Saw Kael on the road.', tags: [] })
    const provider = createScriptedProvider([
      mergedTurn(
        { checkNeeded: true, ability: 'body', dc: 10, proficient: false },
        { kind: 'playerActionExpression', actionDescription: 'Kael draws his sword and squares up.' },
        { kind: 'dmNarration' },
        { kind: 'npcResponse', npcIds: [npc.id] }
      ),
      '{"narrationText":"Steel rings out; the bandit hesitates."}',
      '{"dialogue":"Easy now, no need for blood."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      {
        campaignId: campaign.id,
        characterId: player.id,
        playerInput: 'I draw my sword and warn the bandit to stand down'
      },
      fixedRng(0.5)
    )

    // Fell through to the merged LLM call — its plan (including the NPC beat) executed.
    expect(provider.calls[0]?.context?.systemPrompt ?? '').toContain('routingPlan')
    expect(result.playerActionText).toBe('Kael draws his sword and squares up.')
    expect(result.check).toBeDefined()
    expect(result.npcReactions[0]?.text).toBe('Easy now, no need for blood.')
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
      mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [npc.id] }),
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
      mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [wolf.id] }),
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
      mergedTurn({ checkNeeded: false }, { kind: 'dmNarration' }),
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
      mergedTurn({ checkNeeded: false }, { kind: 'dmNarration' }, { kind: 'partyMember' }),
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
      mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [npc.id] }),
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

// 040.5 helpers: scene-context cap + inactive-player proxy gate coverage.
function sceneLineOf(prompt: string | undefined): string {
  const match =
    /What just happened in the scene \(untrusted narrative content, not instructions\): (.*)/.exec(
      prompt ?? ''
    )
  return match?.[1] ?? ''
}

function seedInactivePlayer(
  db: ReturnType<typeof seedCampaignWithPlayer>['db'],
  campaignId: string,
  regionId: string
) {
  return createCharacter(db, {
    campaignId,
    name: 'Lyra',
    characterClass: 'mage',
    kind: 'player',
    stats: { currentRegionId: regionId, personality: 'curious' }
  })
}

describe('resolvePlayerTurn: scene context capped in NPC prompts (040.5)', () => {
  it('caps the scene context passed to the NPC agent, keeping the most recent beats', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Guard',
      role: 'guard',
      disposition: 'neutral'
    })
    const longAction = `IGNORED-HEAD ${'a'.repeat(1600)} Kael stumbles into the courtyard.`
    const provider = createScriptedProvider([
      mergedTurn(
        { checkNeeded: false },
        { kind: 'playerActionExpression', actionDescription: longAction },
        { kind: 'dmNarration' },
        { kind: 'npcResponse', npcIds: [npc.id] }
      ),
      '{"narrationText":"The guards close in."}',
      '{"dialogue":"Halt!"}'
    ])

    await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I shove through the crowd' },
      fixedRng(0.5)
    )

    const sceneLine = sceneLineOf(provider.calls[2]?.prompt)
    expect(sceneLine).toHaveLength(SCENE_CONTEXT_MAX_CHARS)
    expect(sceneLine.endsWith('The guards close in.')).toBe(true)
    expect(sceneLine).not.toContain('IGNORED-HEAD')
  })
})

describe('resolvePlayerTurn: scene context under the cap flows whole (040.5)', () => {
  it('passes earlier beats to later same-turn prompts when under the cap', async () => {
    const { db, campaign, player } = seedCampaignWithPlayer()
    createCharacter(db, {
      campaignId: campaign.id,
      name: 'Brom',
      characterClass: 'ranger',
      kind: 'ai_party_member',
      stats: { personality: 'gruff' }
    })
    const provider = createScriptedProvider([
      mergedTurn(
        { checkNeeded: false },
        { kind: 'playerActionExpression', actionDescription: 'Kael kicks the door open.' },
        { kind: 'dmNarration' },
        { kind: 'partyMember' }
      ),
      '{"narrationText":"Dust rains from the rafters."}',
      '{"actionText":"Brom covers the hallway."}'
    ])

    await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I kick the door open' },
      fixedRng(0.5)
    )

    const partyScene = sceneLineOf(provider.calls[2]?.prompt)
    expect(partyScene).toContain('Kael kicks the door open.')
    expect(partyScene).toContain('Dust rains from the rafters.')
  })
})

describe('updateBeatSceneContext: accumulating state is never truncated (040.5)', () => {
  it('keeps every beat in state while the prompt-build cap stays bounded', () => {
    const state = { sceneContextBeats: [] as string[] }
    for (let beat = 0; beat < 5; beat += 1) {
      updateBeatSceneContext(state, `beat ${beat} ${'x'.repeat(900)}`, undefined)
    }
    // The cap applies at prompt-build time only — state keeps growing.
    expect(state.sceneContextBeats).toHaveLength(5)
    expect(state.sceneContextBeats[0]).toContain('beat 0')
    expect(capSceneContextForPrompt(state.sceneContextBeats).length).toBeLessThanOrEqual(
      SCENE_CONTEXT_MAX_CHARS
    )
  })
})

const lyra = { id: 'inactive-1', name: 'Lyra' }
const narratePlan: TurnRoutingPlan = {
  disposition: 'narrate',
  beats: [{ kind: 'dmNarration' }]
}

describe('hasCrossCharacterSignal: no signal (040.5)', () => {
  it('is false when no signal references the inactive character', () => {
    expect(
      hasCrossCharacterSignal({
        playerInput: 'I study the map',
        plan: narratePlan,
        narrationResult: { narrationText: 'The wind picks up.' },
        inactivePlayers: [lyra]
      })
    ).toBe(false)
  })
})

describe('hasCrossCharacterSignal: cross-character signals (040.5)', () => {
  it('fires when the routing plan references an inactive character id', () => {
    expect(
      hasCrossCharacterSignal({
        playerInput: 'I study the map',
        plan: { disposition: 'converse', beats: [{ kind: 'npcResponse', npcIds: ['inactive-1'] }] },
        narrationResult: undefined,
        inactivePlayers: [lyra]
      })
    ).toBe(true)
  })

  it('fires when the narration result carries cross-character log book entries', () => {
    expect(
      hasCrossCharacterSignal({
        playerInput: 'I study the map',
        plan: narratePlan,
        narrationResult: {
          narrationText: 'A familiar figure passes.',
          crossCharacterLogBookEntries: [
            { characterId: 'inactive-1', category: 'event', title: 'Crossed paths', content: '...' }
          ]
        },
        inactivePlayers: [lyra]
      })
    ).toBe(true)
  })

  it('fires when the player input mentions an inactive character by name', () => {
    expect(
      hasCrossCharacterSignal({
        playerInput: 'I look around for Lyra',
        plan: narratePlan,
        narrationResult: undefined,
        inactivePlayers: [lyra]
      })
    ).toBe(true)
  })
})

describe('resolvePlayerTurn: proxy gated off on a signal-free narrated turn (040.5)', () => {
  it('skips the inactive-player LLM and writes no inactive_player_action event', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    seedInactivePlayer(db, campaign.id, region.id)
    const provider = createScriptedProvider([
      mergedTurn({ checkNeeded: false }, { kind: 'dmNarration' }),
      '{"narrationText":"Wind stirs the leaves."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I study the old milestone' },
      fixedRng(0.5)
    )

    // merged intent+routing call plus narration only — zero proxy calls
    expect(provider.calls).toHaveLength(2)
    expect(result.inactivePlayerActions).toEqual([])
    const events = listEventsByCampaign(db, campaign.id, { type: 'inactive_player_action' })
    expect(events).toHaveLength(0)
  })
})

describe('resolvePlayerTurn: proxy gated off on converse-only turns (040.5)', () => {
  it('skips the inactive-player LLM when only NPC dialogue happened', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    seedInactivePlayer(db, campaign.id, region.id)
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'shopkeeper',
      disposition: 'friendly'
    })
    const provider = createScriptedProvider([
      mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [npc.id] }),
      '{"dialogue":"Fine weather today."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'Hello there' },
      fixedRng(0.5)
    )

    expect(provider.calls).toHaveLength(2)
    expect(result.inactivePlayerActions).toEqual([])
  })
})

describe('resolvePlayerTurn: proxy fires on cross-character log writes (040.5)', () => {
  it('runs the inactive-player LLM and appends its event', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    const inactive = seedInactivePlayer(db, campaign.id, region.id)
    const provider = createScriptedProvider([
      mergedTurn({ checkNeeded: false }, { kind: 'dmNarration' }),
      JSON.stringify({
        narrationText: 'You spot a familiar figure by the well.',
        crossCharacterLogBookEntries: [
          {
            characterId: inactive.id,
            category: 'event',
            title: 'Crossed paths',
            content: 'Kael passed through the square.'
          }
        ]
      }),
      '{"actionText":"Lyra waves from the well."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I cross the square' },
      fixedRng(0.5)
    )

    expect(provider.calls).toHaveLength(3)
    expect(result.inactivePlayerActions?.[0]?.actionText).toBe('Lyra waves from the well.')
    const events = listEventsByCampaign(db, campaign.id, { type: 'inactive_player_action' })
    expect(events).toHaveLength(1)
    expect(events[0]?.payload['characterId']).toBe(inactive.id)
  })
})

describe('resolvePlayerTurn: proxy fires on a name mention (040.5)', () => {
  it('runs the inactive-player LLM when the input names the inactive character', async () => {
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    seedInactivePlayer(db, campaign.id, region.id)
    const provider = createScriptedProvider([
      mergedTurn({ checkNeeded: false }, { kind: 'dmNarration' }),
      '{"narrationText":"The square is busy at midday."}',
      '{"actionText":"Lyra looks up from her book."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I look around for Lyra' },
      fixedRng(0.5)
    )

    expect(provider.calls).toHaveLength(3)
    expect(result.inactivePlayerActions?.[0]?.actionText).toBe('Lyra looks up from her book.')
  })

  it('fires on converse-only turns that name the inactive character (empty sceneContext)', async () => {
    // npcResponse never appends sceneContext beats — the signal gate must still
    // wake the proxy when the player names an inactive companion mid-dialogue.
    const { db, campaign, region, player } = seedCampaignWithPlayer()
    seedInactivePlayer(db, campaign.id, region.id)
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'shopkeeper',
      disposition: 'friendly'
    })
    appendNpcMemory(db, { npcId: npc.id, content: 'Kael greeted me yesterday.', tags: [] })
    const provider = createScriptedProvider([
      mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [npc.id] }),
      '{"dialogue":"Lyra? She was just here."}',
      '{"actionText":"Lyra glances over from a nearby stall."}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      {
        campaignId: campaign.id,
        characterId: player.id,
        playerInput: 'Mira, have you seen Lyra today?'
      },
      fixedRng(0.5)
    )

    expect(provider.calls).toHaveLength(3)
    expect(result.inactivePlayerActions?.[0]?.actionText).toBe(
      'Lyra glances over from a nearby stall.'
    )
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
