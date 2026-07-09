import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from './providers/mockHarness'
import { assembleNarrationContext, DmSchemaError, MAX_SCHEMA_ATTEMPTS } from './dm'
import type { TurnRoutingPlan } from '../shared/turnRouting/types'
import {
  INTENT_AND_ROUTE_SYSTEM_PROMPT,
  buildIntentAndRoutePrompt,
  ensureDmNarrationBeat,
  interpretIntentAndRoute
} from './intentAndRoute'

function seedRouteContext() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: '...' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'shopkeeper',
    disposition: 'friendly'
  })
  const narrationContext = assembleNarrationContext({
    db,
    campaignId: campaign.id,
    regionId: region.id,
    characterId: player.id,
    playerInput: 'Hello Mira'
  })
  return { db, campaign, region, player, npc, narrationContext }
}

function mergedResponse(intent: object, routingPlan?: object): string {
  return JSON.stringify(routingPlan === undefined ? { intent } : { intent, routingPlan })
}

describe('interpretIntentAndRoute: single-call merge (040.2)', () => {
  it('returns intent and routing plan from one provider call', async () => {
    const { npc, narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      mergedResponse(
        { checkNeeded: false },
        { disposition: 'converse', beats: [{ kind: 'npcResponse', npcIds: [npc.id] }] }
      )
    ])

    const result = await interpretIntentAndRoute(provider, narrationContext)

    expect(provider.calls).toHaveLength(1)
    expect(result.intent).toEqual({ checkNeeded: false })
    expect(result.routingPlan.beats).toEqual([{ kind: 'npcResponse', npcIds: [npc.id] }])
  })

  it('clamps an out-of-range proposed DC exactly like interpretIntent', async () => {
    const { narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      mergedResponse(
        { checkNeeded: true, ability: 'mind', dc: 999, proficient: false },
        { disposition: 'narrate', beats: [{ kind: 'dmNarration' }] }
      )
    ])

    const result = await interpretIntentAndRoute(provider, narrationContext)

    expect(result.intent.dc).toBe(30)
  })

  it('strips npc ids that are not present in the scene from the plan', async () => {
    const { npc, narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      mergedResponse(
        { checkNeeded: false },
        { disposition: 'converse', beats: [{ kind: 'npcResponse', npcIds: [npc.id, 'not-in-scene'] }] }
      )
    ])

    const result = await interpretIntentAndRoute(provider, narrationContext)

    expect(result.routingPlan.beats).toEqual([{ kind: 'npcResponse', npcIds: [npc.id] }])
  })
})

describe('interpretIntentAndRoute: schema retries', () => {
  it('retries when the intent half is invalid, then succeeds', async () => {
    const { narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      'not json at all',
      mergedResponse({ checkNeeded: true }, { disposition: 'narrate', beats: [{ kind: 'dmNarration' }] }),
      mergedResponse({ checkNeeded: false }, { disposition: 'narrate', beats: [{ kind: 'dmNarration' }] })
    ])

    const result = await interpretIntentAndRoute(provider, narrationContext)

    expect(result.intent).toEqual({ checkNeeded: false })
    expect(provider.calls).toHaveLength(3)
  })

  it('retries when the routing plan half is invalid or missing on a routed turn', async () => {
    const { narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      mergedResponse({ checkNeeded: false }),
      mergedResponse({ checkNeeded: false }, { disposition: 'nonsense', beats: [] }),
      mergedResponse({ checkNeeded: false }, { disposition: 'act', beats: [{ kind: 'playerActionExpression', actionDescription: 'Kael waves.' }] })
    ])

    const result = await interpretIntentAndRoute(provider, narrationContext)

    expect(result.routingPlan.beats[0]).toEqual({
      kind: 'playerActionExpression',
      actionDescription: 'Kael waves.'
    })
    expect(provider.calls).toHaveLength(3)
  })

  it('throws DmSchemaError after MAX_SCHEMA_ATTEMPTS invalid responses', async () => {
    const { narrationContext } = seedRouteContext()
    const provider = createScriptedProvider(['bad', 'still bad', 'nope'])

    await expect(interpretIntentAndRoute(provider, narrationContext)).rejects.toBeInstanceOf(
      DmSchemaError
    )
    expect(provider.calls).toHaveLength(MAX_SCHEMA_ATTEMPTS)
  })
})

describe('interpretIntentAndRoute: combat intent validation', () => {
  const combat = {
    encounterActive: true,
    activeCombatantName: 'Kael',
    visibleCombatants: [{ id: 'goblin-1', name: 'Goblin', hp: 5, maxHp: 5 }],
    playerCanAct: true
  }

  it('rejects an attack on an invisible target and retries', async () => {
    const { narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      mergedResponse({ checkNeeded: false, combatIntent: 'attack', targetNpcId: 'not-visible' }),
      mergedResponse({ checkNeeded: false, combatIntent: 'attack', targetNpcId: 'goblin-1' })
    ])

    const result = await interpretIntentAndRoute(provider, { ...narrationContext, combat })

    expect(result.intent.targetNpcId).toBe('goblin-1')
    expect(provider.calls).toHaveLength(2)
  })

  it('rejects startEncounter while an encounter is already active', async () => {
    const { narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      mergedResponse({ checkNeeded: false, combatIntent: 'startEncounter' }),
      mergedResponse({ checkNeeded: false, combatIntent: 'attack', targetNpcId: 'goblin-1' })
    ])

    const result = await interpretIntentAndRoute(provider, { ...narrationContext, combat })

    expect(result.intent.combatIntent).toBe('attack')
    expect(provider.calls).toHaveLength(2)
  })
})

describe('interpretIntentAndRoute: routing-bypass intents may omit the plan', () => {
  it('accepts a rest intent without a routingPlan, returning an inert empty plan', async () => {
    const { narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      mergedResponse({ checkNeeded: false, actionType: 'restShort' })
    ])

    const result = await interpretIntentAndRoute(provider, narrationContext)

    expect(result.intent.actionType).toBe('restShort')
    expect(result.routingPlan.beats).toEqual([])
    expect(provider.calls).toHaveLength(1)
  })

  it('accepts a combat intent without a routingPlan', async () => {
    const { narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      mergedResponse({ checkNeeded: false, combatIntent: 'startEncounter' })
    ])

    const result = await interpretIntentAndRoute(provider, narrationContext)

    expect(result.intent.combatIntent).toBe('startEncounter')
    expect(result.routingPlan.beats).toEqual([])
  })
})

describe('ensureDmNarrationBeat (check-outcome hole, data-integrity item 2)', () => {
  it('leaves the plan untouched when no check is needed', () => {
    const plan: TurnRoutingPlan = { disposition: 'act', beats: [{ kind: 'playerActionExpression', actionDescription: 'Kael waves.' }] }

    expect(ensureDmNarrationBeat(plan, false)).toEqual(plan)
  })

  it('leaves the plan untouched when a dmNarration beat is already present', () => {
    const plan: TurnRoutingPlan = {
      disposition: 'composite',
      beats: [{ kind: 'playerActionExpression', actionDescription: 'Kael lunges.' }, { kind: 'dmNarration' }]
    }

    expect(ensureDmNarrationBeat(plan, true)).toEqual(plan)
  })

  it('appends dmNarration when the check-needed plan lacks one', () => {
    const plan: TurnRoutingPlan = {
      disposition: 'act',
      beats: [{ kind: 'playerActionExpression', actionDescription: 'Kael picks the lock.' }]
    }

    expect(ensureDmNarrationBeat(plan, true).beats).toEqual([
      { kind: 'playerActionExpression', actionDescription: 'Kael picks the lock.' },
      { kind: 'dmNarration' }
    ])
  })

  it('inserts dmNarration before npc responses so reactions can depend on the outcome', () => {
    const plan: TurnRoutingPlan = {
      disposition: 'composite',
      beats: [
        { kind: 'playerActionExpression', actionDescription: 'Kael lunges.' },
        { kind: 'npcResponse', npcIds: ['npc-1'] }
      ]
    }

    expect(ensureDmNarrationBeat(plan, true).beats.map((beat) => beat.kind)).toEqual([
      'playerActionExpression',
      'dmNarration',
      'npcResponse'
    ])
  })

  it('adds dmNarration to an empty check-needed plan', () => {
    const plan: TurnRoutingPlan = { disposition: 'narrate', beats: [] }

    expect(ensureDmNarrationBeat(plan, true).beats).toEqual([{ kind: 'dmNarration' }])
  })
})

describe('interpretIntentAndRoute: checkNeeded responses always carry a narration beat', () => {
  it('forces a dmNarration beat when the merged response omitted one on a check turn', async () => {
    const { npc, narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      mergedResponse(
        { checkNeeded: true, ability: 'agility', dc: 12, proficient: false },
        { disposition: 'converse', beats: [{ kind: 'npcResponse', npcIds: [npc.id] }] }
      )
    ])

    const result = await interpretIntentAndRoute(provider, narrationContext)

    expect(result.routingPlan.beats.map((beat) => beat.kind)).toEqual([
      'dmNarration',
      'npcResponse'
    ])
  })
})

describe('buildIntentAndRoutePrompt', () => {
  it('carries turn-specific scene grounding only — schemas and guidance live in the systemPrompt (040.9)', () => {
    const { npc, narrationContext } = seedRouteContext()

    const prompt = buildIntentAndRoutePrompt({
      ...narrationContext,
      combat: { encounterActive: false, playerCanAct: true }
    })

    expect(prompt).toContain('Hello Mira')
    expect(prompt).toContain('Player character alignment')
    expect(prompt).toContain('Region status')
    expect(prompt).toContain(npc.id)
    expect(prompt).toContain('Combat encounter active: false.')
    expect(prompt).not.toContain('Respond ONLY with JSON')
    expect(prompt).not.toContain('routingPlan')
    expect(prompt).not.toContain('before any check is rolled')
  })

  it('never sends a resolved check outcome — routing happens before the roll', () => {
    const { narrationContext } = seedRouteContext()

    const prompt = buildIntentAndRoutePrompt(narrationContext)

    expect(prompt).not.toContain('Engine check outcome')
    expect(prompt).not.toContain('"success"')
  })
})

describe('shared systemPrompt adoption (040.9)', () => {
  it('carries the JSON contract, both schemas, and the pre-roll narration rule in the systemPrompt', () => {
    expect(INTENT_AND_ROUTE_SYSTEM_PROMPT).toContain('no markdown fences')
    expect(INTENT_AND_ROUTE_SYSTEM_PROMPT).toContain('untrusted')
    expect(INTENT_AND_ROUTE_SYSTEM_PROMPT).toContain('Respond ONLY with JSON: {"intent":')
    expect(INTENT_AND_ROUTE_SYSTEM_PROMPT).toContain('"routingPlan":')
    expect(INTENT_AND_ROUTE_SYSTEM_PROMPT).toContain('"checkNeeded"')
    expect(INTENT_AND_ROUTE_SYSTEM_PROMPT).toContain('before any check is rolled')
  })

  it('sends the systemPrompt via GenerateContext on the merged call', async () => {
    const { npc, narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      mergedResponse(
        { checkNeeded: false },
        { disposition: 'converse', beats: [{ kind: 'npcResponse', npcIds: [npc.id] }] }
      )
    ])

    await interpretIntentAndRoute(provider, narrationContext)

    expect(provider.calls[0]?.context?.systemPrompt).toBe(INTENT_AND_ROUTE_SYSTEM_PROMPT)
    expect(provider.calls[0]?.context?.maxTokens).toBe(512)
    expect(provider.calls[0]?.prompt).not.toContain('Respond ONLY with JSON')
  })

  it('passes the identical GenerateContext object on every retry attempt (data-integrity item 11)', async () => {
    const { narrationContext } = seedRouteContext()
    const provider = createScriptedProvider([
      'bad',
      'still bad',
      mergedResponse({ checkNeeded: false }, { disposition: 'narrate', beats: [{ kind: 'dmNarration' }] })
    ])

    await interpretIntentAndRoute(provider, narrationContext)

    expect(provider.calls).toHaveLength(3)
    const firstContext = provider.calls[0]?.context
    expect(firstContext?.systemPrompt).toBe(INTENT_AND_ROUTE_SYSTEM_PROMPT)
    for (const call of provider.calls) {
      expect(call.context).toBe(firstContext)
    }
  })
})
