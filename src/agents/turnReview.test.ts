import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from './providers/mockHarness'
import { assembleNarrationContext, DmSchemaError, MAX_SCHEMA_ATTEMPTS } from './dm'
import { reviewTurn } from './turnReview'

function seedReviewContext() {
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

describe('reviewTurn: converse and act dispositions', () => {
  it('routes a converse-only turn to targeted npc response without narration', async () => {
    const { npc, narrationContext } = seedReviewContext()
    const provider = createScriptedProvider([
      JSON.stringify({
        disposition: 'converse',
        beats: [{ kind: 'npcResponse', npcIds: [npc.id] }]
      })
    ])

    const plan = await reviewTurn(provider, {
      ...narrationContext,
      intent: { checkNeeded: false }
    })

    expect(plan.beats).toEqual([{ kind: 'npcResponse', npcIds: [npc.id] }])
    expect(provider.calls[0]?.prompt).toContain('Player character alignment')
    expect(provider.calls[0]?.prompt).toContain(npc.id)
  })

  it('routes an action-expression-only turn', async () => {
    const { narrationContext } = seedReviewContext()
    const provider = createScriptedProvider([
      JSON.stringify({
        disposition: 'act',
        beats: [{ kind: 'playerActionExpression', actionDescription: 'Kael draws his sword.' }]
      })
    ])

    const plan = await reviewTurn(provider, {
      ...narrationContext,
      playerInput: 'I draw my sword',
      intent: { checkNeeded: false }
    })

    expect(plan.beats[0]).toEqual({
      kind: 'playerActionExpression',
      actionDescription: 'Kael draws his sword.'
    })
  })
})

describe('reviewTurn: narrate and composite dispositions', () => {
  it('routes a narrate-with-check turn including dmNarration', async () => {
    const { narrationContext } = seedReviewContext()
    const provider = createScriptedProvider([
      JSON.stringify({
        disposition: 'narrate',
        beats: [{ kind: 'dmNarration' }]
      })
    ])

    const plan = await reviewTurn(provider, {
      ...narrationContext,
      playerInput: 'I pick the lock',
      intent: { checkNeeded: true, ability: 'agility', dc: 12, proficient: false },
      checkOutcome: { success: false, total: 8, dc: 12 }
    })

    expect(plan.beats).toEqual([{ kind: 'dmNarration' }])
    expect(provider.calls[0]?.prompt).toContain('"success":false')
  })

  it('preserves composite beat ordering from the agent', async () => {
    const { npc, narrationContext } = seedReviewContext()
    const provider = createScriptedProvider([
      JSON.stringify({
        disposition: 'composite',
        beats: [
          { kind: 'playerActionExpression', actionDescription: 'Kael lunges forward.' },
          { kind: 'dmNarration' },
          { kind: 'npcResponse', npcIds: [npc.id] }
        ]
      })
    ])

    const plan = await reviewTurn(provider, {
      ...narrationContext,
      intent: { checkNeeded: true, ability: 'body', dc: 10, proficient: true },
      checkOutcome: { success: true, total: 14, dc: 10 }
    })

    expect(plan.beats.map((beat) => beat.kind)).toEqual([
      'playerActionExpression',
      'dmNarration',
      'npcResponse'
    ])
  })
})

describe('reviewTurn: slim context (040.4)', () => {
  it('sends slim recent events in the review prompt — no event ids or raw payloads', async () => {
    const { db, campaign, region, player, npc } = seedReviewContext()
    const priorEvent = appendEvent(db, {
      campaignId: campaign.id,
      type: 'npc_reaction',
      payload: {
        npcId: npc.id,
        npcName: 'Mira',
        text: 'Back so soon?',
        reactionKind: 'dialogue',
        attack: false
      }
    })
    const narrationContext = assembleNarrationContext({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      characterId: player.id,
      playerInput: 'Hello again'
    })
    const provider = createScriptedProvider([
      JSON.stringify({ disposition: 'converse', beats: [{ kind: 'npcResponse', npcIds: [npc.id] }] })
    ])

    await reviewTurn(provider, { ...narrationContext, intent: { checkNeeded: false } })

    const prompt = provider.calls[0]?.prompt ?? ''
    expect(prompt).toContain('Mira: Back so soon?')
    expect(prompt).not.toContain(priorEvent.id)
    expect(prompt).not.toContain(campaign.id)
    expect(prompt).not.toContain('"reactionKind"')
  })
})

describe('reviewTurn: validation', () => {
  it('strips invalid npc ids from the plan', async () => {
    const { npc, narrationContext } = seedReviewContext()
    const provider = createScriptedProvider([
      JSON.stringify({
        disposition: 'converse',
        beats: [{ kind: 'npcResponse', npcIds: [npc.id, 'not-in-scene'] }]
      })
    ])

    const plan = await reviewTurn(provider, {
      ...narrationContext,
      intent: { checkNeeded: false }
    })

    expect(plan.beats).toEqual([{ kind: 'npcResponse', npcIds: [npc.id] }])
  })

  it('retries on schema failure then throws after max attempts', async () => {
    const { narrationContext } = seedReviewContext()
    const provider = createScriptedProvider(['bad', 'still bad', 'nope'])

    await expect(
      reviewTurn(provider, { ...narrationContext, intent: { checkNeeded: false } })
    ).rejects.toBeInstanceOf(DmSchemaError)
    expect(provider.calls).toHaveLength(MAX_SCHEMA_ATTEMPTS)
  })
})
