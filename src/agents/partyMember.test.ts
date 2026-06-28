import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { createScriptedProvider } from './providers/mockHarness'
import { assemblePartyMemberContext, decidePartyMemberAction } from './partyMember'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
}

describe('assemblePartyMemberContext', () => {
  it('includes relationship events from an earlier session alongside a later session', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const characterId = 'party-member-1'

    const earlier = appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId, content: 'helped during the goblin ambush' },
      timestamp: '2024-01-01T00:00:00.000Z'
    })
    const later = appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId, content: 'shared a meal at the tavern' },
      timestamp: '2024-06-01T00:00:00.000Z'
    })

    const context = assemblePartyMemberContext(db, campaign.id, characterId)

    expect(context.characterId).toBe(characterId)
    expect(context.relationshipEvents.map((e) => e.id)).toEqual([earlier.id, later.id])
  })

  it('excludes events tagged to a different characterId', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const characterId = 'party-member-1'
    const otherCharacterId = 'party-member-2'

    appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId: otherCharacterId, content: "not this character's memory" }
    })
    const own = appendEvent(db, {
      campaignId: campaign.id,
      type: 'party_member_interaction',
      payload: { characterId, content: "this character's memory" }
    })

    const context = assemblePartyMemberContext(db, campaign.id, characterId)

    expect(context.relationshipEvents.map((e) => e.id)).toEqual([own.id])
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
    const context = assemblePartyMemberContext(db, campaign.id, character.id)
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
    const context = assemblePartyMemberContext(db, campaign.id, character.id)
    const provider = createScriptedProvider(['Brom just shrugs.'])

    const action = await decidePartyMemberAction(provider, character, context, 'Nothing happens.')

    expect(action).toEqual({ actionText: 'Brom just shrugs.' })
  })
})
