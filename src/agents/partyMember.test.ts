import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { appendEvent } from '../db/repositories/events'
import { assemblePartyMemberContext } from './partyMember'

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
