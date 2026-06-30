import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import {
  createCharacter,
  getCharacterById,
  listPartyMembersForPlayer,
  transferPartyMemberOwnership
} from './characters'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
}

describe('characters repository: party ownership round-trip (038.2)', () => {
  it('round-trips owner_player_character_id', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'Fighter',
      kind: 'player'
    })
    const member = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Rook',
      characterClass: 'Rogue',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: player.id
    })

    expect(getCharacterById(db, member.id)?.ownerPlayerCharacterId).toBe(player.id)
  })
})

describe('characters repository: party roster listing (038.2)', () => {
  it('listPartyMembersForPlayer returns owned and shared members', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const playerA = createCharacter(db, {
      campaignId: campaign.id,
      name: 'A',
      characterClass: 'Fighter',
      kind: 'player'
    })
    const playerB = createCharacter(db, {
      campaignId: campaign.id,
      name: 'B',
      characterClass: 'Mage',
      kind: 'player'
    })
    const owned = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Owned',
      characterClass: 'Cleric',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: playerA.id
    })
    const shared = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Shared',
      characterClass: 'Ranger',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: null
    })
    createCharacter(db, {
      campaignId: campaign.id,
      name: 'Other',
      characterClass: 'Rogue',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: playerB.id
    })

    const roster = listPartyMembersForPlayer(db, playerA.id).map((m) => m.id)
    expect(roster).toContain(owned.id)
    expect(roster).toContain(shared.id)
    expect(roster).toHaveLength(2)
  })
})

describe('characters repository: party ownership transfer (038.2)', () => {
  it('transferPartyMemberOwnership reassigns owner', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const playerA = createCharacter(db, {
      campaignId: campaign.id,
      name: 'A',
      characterClass: 'Fighter',
      kind: 'player'
    })
    const playerB = createCharacter(db, {
      campaignId: campaign.id,
      name: 'B',
      characterClass: 'Mage',
      kind: 'player'
    })
    const member = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Recruit',
      characterClass: 'Rogue',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: playerA.id
    })

    transferPartyMemberOwnership(db, member.id, playerB.id)
    expect(getCharacterById(db, member.id)?.ownerPlayerCharacterId).toBe(playerB.id)
    expect(listPartyMembersForPlayer(db, playerA.id).map((m) => m.id)).not.toContain(member.id)
    expect(listPartyMembersForPlayer(db, playerB.id).map((m) => m.id)).toContain(member.id)
  })
})
