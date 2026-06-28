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

describe('assemblePartyMemberContext', () => {
  it('includes relationship events from an earlier session alongside a later session', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = seedPartyMember(db, campaign.id)

    const earlier = appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId: character.id, content: 'helped during the goblin ambush' },
      timestamp: '2024-01-01T00:00:00.000Z'
    })
    const later = appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId: character.id, content: 'shared a meal at the tavern' },
      timestamp: '2024-06-01T00:00:00.000Z'
    })

    const context = assemblePartyMemberContext(db, campaign.id, character)

    expect(context.characterId).toBe(character.id)
    expect(context.relationshipEvents.map((e) => e.id)).toEqual([earlier.id, later.id])
  })

  it('excludes events tagged to a different characterId', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = seedPartyMember(db, campaign.id)

    appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId: 'someone-else', content: "not this character's memory" }
    })
    const own = appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId: character.id, content: "this character's memory" }
    })

    const context = assemblePartyMemberContext(db, campaign.id, character)

    expect(context.relationshipEvents.map((e) => e.id)).toEqual([own.id])
  })
})

describe('assemblePartyMemberContext: promotion memory carry-forward (011.4)', () => {
  it('carries forward pre-promotion npc_memories when sourceNpcId is set', () => {
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

    const context = assemblePartyMemberContext(db, campaign.id, character)

    expect(context.priorNpcMemories).toHaveLength(1)
    expect(context.priorNpcMemories[0]?.content).toBe('Sold the party a healing potion.')
  })

  it('has no prior memories when the character was not promoted from an NPC', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = seedPartyMember(db, campaign.id)

    const context = assemblePartyMemberContext(db, campaign.id, character)

    expect(context.priorNpcMemories).toEqual([])
  })
})

describe('decidePartyMemberAction', () => {
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
    const context = assemblePartyMemberContext(db, campaign.id, character)
    const provider = createScriptedProvider(['{"actionText":"Brom nocks an arrow and covers the rear."}'])

    const action = await decidePartyMemberAction(provider, character, context, 'Goblins ambush the party.')

    expect(action).toEqual({ actionText: 'Brom nocks an arrow and covers the rear.' })
  })

  it('falls back to the raw response text when the schema is malformed', async () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Brom',
      characterClass: 'ranger',
      kind: 'ai_party_member'
    })
    const context = assemblePartyMemberContext(db, campaign.id, character)
    const provider = createScriptedProvider(['Brom just shrugs.'])

    const action = await decidePartyMemberAction(provider, character, context, 'Nothing happens.')

    expect(action).toEqual({ actionText: 'Brom just shrugs.' })
  })
})
