import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from './providers/mockHarness'
import { assemblePartyMemberContext, decidePartyMemberAction } from './partyMember'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
}

function seedPartyMember(db: ReturnType<typeof createTestDb>, campaignId: string, sourceNpcId: string | null = null) {
  return createCharacter(db, {
    campaignId,
    name: 'Brom',
    characterClass: 'ranger',
    kind: 'ai_party_member',
    sourceNpcId
  })
}

describe('assemblePartyMemberContext relationship events', () => {
  it('includes relationship events from an earlier session alongside a later session', async () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = seedPartyMember(db, campaign.id)

    appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId: character.id, content: 'helped during the goblin ambush' },
      timestamp: '2024-01-01T00:00:00.000Z'
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId: character.id, content: 'shared a meal at the tavern' },
      timestamp: '2024-06-01T00:00:00.000Z'
    })

    const context = await assemblePartyMemberContext(db, campaign.id, character)

    expect(context.characterId).toBe(character.id)
    // Slim event shape (040.4): no ids, just type + derived summary in original order.
    expect(context.relationshipEvents.map((e) => e.summary)).toEqual([
      'helped during the goblin ambush',
      'shared a meal at the tavern'
    ])
  })

  it('excludes events tagged to a different characterId', async () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = seedPartyMember(db, campaign.id)

    appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId: 'someone-else', content: "not this character's memory" }
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId: character.id, content: "this character's memory" }
    })

    const context = await assemblePartyMemberContext(db, campaign.id, character)

    expect(context.relationshipEvents.map((e) => e.summary)).toEqual(["this character's memory"])
  })
})

describe('assemblePartyMemberContext companion order', () => {
  it('includes an active companion order from stats when present', async () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Brom',
      characterClass: 'ranger',
      kind: 'ai_party_member',
      stats: {
        companionOrder: { text: 'Hold the doorway', setAt: '2026-07-21T12:00:00.000Z' }
      }
    })
    const context = await assemblePartyMemberContext(db, campaign.id, character)
    expect(context.playerOrder?.text).toBe('Hold the doorway')
  })

  it('omits playerOrder when no companion order is set', async () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = seedPartyMember(db, campaign.id)
    const context = await assemblePartyMemberContext(db, campaign.id, character)
    expect(context.playerOrder).toBeNull()
  })
})

describe('assemblePartyMemberContext: promotion memory carry-forward (011.4)', () => {
  it('carries forward pre-promotion npc_memories when sourceNpcId is set', async () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const region = createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: '...' })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'shopkeeper',
      disposition: 'friendly'
    })
    appendNpcMemory(db, { npcId: npc.id, content: 'Sold the party a healing potion.', tags: [] })
    const character = seedPartyMember(db, campaign.id, npc.id)

    const context = await assemblePartyMemberContext(db, campaign.id, character)

    expect(context.priorNpcMemories).toHaveLength(1)
    expect(context.priorNpcMemories[0]?.content).toBe('Sold the party a healing potion.')
  })

  it('has no prior memories when the character was not promoted from an NPC', async () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = seedPartyMember(db, campaign.id)

    const context = await assemblePartyMemberContext(db, campaign.id, character)

    expect(context.priorNpcMemories).toEqual([])
  })
})

describe('decidePartyMemberAction generation', () => {
  it('generates an in-character action without any player direction', async () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Brom',
      characterClass: 'ranger',
      kind: 'ai_party_member',
      stats: { personality: 'gruff but loyal' }
    })
    const context = await assemblePartyMemberContext(db, campaign.id, character)
    const provider = createScriptedProvider(['{"actionText":"Brom nocks an arrow and covers the rear."}'])

    const action = await decidePartyMemberAction(provider, character, context, 'Goblins ambush the party.')

    expect(action).toEqual({ actionText: 'Brom nocks an arrow and covers the rear.' })
  })
})

describe('decidePartyMemberAction prompt shape', () => {
  it('moves the action schema into systemPrompt — user prompt keeps persona and scene (040.9)', async () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = seedPartyMember(db, campaign.id)
    const context = await assemblePartyMemberContext(db, campaign.id, character)
    const provider = createScriptedProvider(['{"actionText":"Brom scans the treeline."}'])

    await decidePartyMemberAction(provider, character, context, 'A twig snaps nearby.')

    const call = provider.calls[0]!
    expect(call.prompt).toContain('A twig snaps nearby.')
    expect(call.prompt).not.toContain('Respond ONLY with JSON')
    const system = call.context?.systemPrompt ?? ''
    expect(system).toContain('Respond ONLY with JSON: {"actionText":string}')
    expect(system).toContain('without waiting for player direction')
    expect(system).toContain('no markdown fences')
    expect(call.context?.maxTokens).toBe(256)
  })
})

describe('decidePartyMemberAction fallbacks', () => {
  it('falls back to the raw response text when the schema is malformed', async () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Brom',
      characterClass: 'ranger',
      kind: 'ai_party_member'
    })
    const context = await assemblePartyMemberContext(db, campaign.id, character)
    const provider = createScriptedProvider(['Brom just shrugs.'])

    const action = await decidePartyMemberAction(provider, character, context, 'Nothing happens.')

    expect(action).toEqual({ actionText: 'Brom just shrugs.' })
  })

  it('includes player order text in the generate prompt when present', async () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Brom',
      characterClass: 'ranger',
      kind: 'ai_party_member',
      stats: {
        companionOrder: { text: 'Flank left', setAt: '2026-07-21T12:00:00.000Z' }
      }
    })
    const context = await assemblePartyMemberContext(db, campaign.id, character)
    const provider = createScriptedProvider(['{"actionText":"Brom flanks left."}'])
    await decidePartyMemberAction(provider, character, context, 'Combat continues.')
    expect(provider.calls[0]?.prompt).toContain('Flank left')
  })
})
