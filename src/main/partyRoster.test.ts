import { describe, expect, it } from 'vitest'
import { listCharactersByCampaign } from '../db/repositories/characters'
import { createPartyMembers, createPlayerCharacter } from './characterCreationIpc'
import { seedPartyRosterCampaign } from './partyRoster.fixtures'

describe('party roster ownership on create (038.13)', () => {
  it('createPartyMembers sets owner null for first-character shared members', () => {
    const { db, campaign } = seedPartyRosterCampaign()
    const members = createPartyMembers(db, {
      campaignId: campaign.id,
      members: [{ name: 'Brom', characterClass: 'ranger', personality: 'loyal' }]
    })
    expect(members[0]?.ownerPlayerCharacterId).toBeNull()
  })

  it('createPartyMembers sets owner when recruiting player is specified', () => {
    const { db, campaign } = seedPartyRosterCampaign()
    const player = createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      archetype: 'fighter',
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
      alignment: 'neutral_good'
    })
    const members = createPartyMembers(db, {
      campaignId: campaign.id,
      ownerPlayerCharacterId: player.id,
      members: [{ name: 'Lyra', characterClass: 'cleric', personality: 'kind' }]
    })
    expect(members[0]?.ownerPlayerCharacterId).toBe(player.id)
  })
})

describe('party roster shared members on second player (038.13)', () => {
  it('creating a second player character does not duplicate shared roster members', () => {
    const { db, campaign } = seedPartyRosterCampaign()
    createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'First',
      archetype: 'fighter',
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
      alignment: 'lawful_good'
    })
    createPartyMembers(db, {
      campaignId: campaign.id,
      members: [{ name: 'Shared', characterClass: 'ranger', personality: 'shared' }]
    })
    const beforeCount = listCharactersByCampaign(db, campaign.id).filter(
      (c) => c.kind === 'ai_party_member'
    ).length

    createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'Second',
      archetype: 'mage',
      abilityScores: { body: 8, agility: 12, mind: 16, presence: 10 },
      alignment: 'chaotic_neutral'
    })

    const afterCount = listCharactersByCampaign(db, campaign.id).filter(
      (c) => c.kind === 'ai_party_member'
    ).length
    expect(afterCount).toBe(beforeCount)
  })
})
