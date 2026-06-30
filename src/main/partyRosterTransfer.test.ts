import { describe, expect, it } from 'vitest'
import {
  createCharacter,
  listPartyMembersForPlayer
} from '../db/repositories/characters'
import { confirmNpcPromotion, recruitPartyMemberFromRoster } from './promotionIpc'
import { collectEncounterCombatants } from './combatOrchestration'
import { createRegion } from '../db/repositories/regions'
import { createNpc } from '../db/repositories/npcs'
import { seedPartyRosterCampaign } from './partyRoster.fixtures'

describe('party roster transfer (038.13)', () => {
  it('recruitPartyMemberFromRoster transfers ownership between player characters', () => {
    const { db, campaign } = seedPartyRosterCampaign()
    const playerA = createCharacter(db, {
      campaignId: campaign.id,
      name: 'A',
      characterClass: 'fighter',
      kind: 'player'
    })
    const playerB = createCharacter(db, {
      campaignId: campaign.id,
      name: 'B',
      characterClass: 'mage',
      kind: 'player'
    })
    const member = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Recruit',
      characterClass: 'rogue',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: playerA.id
    })

    recruitPartyMemberFromRoster(db, {
      partyMemberId: member.id,
      recruitingPlayerCharacterId: playerB.id
    })

    expect(listPartyMembersForPlayer(db, playerA.id).map((m) => m.id)).not.toContain(member.id)
    expect(listPartyMembersForPlayer(db, playerB.id).map((m) => m.id)).toContain(member.id)
  })
})

describe('party roster promotion ownership (038.13)', () => {
  it('confirmNpcPromotion assigns owner to recruiting player character', () => {
    const { db, campaign } = seedPartyRosterCampaign()
    const region = createRegion(db, { campaignId: campaign.id, name: 'Town', description: '...' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'guard',
      disposition: 'friendly'
    })

    confirmNpcPromotion(db, {
      campaignId: campaign.id,
      npcId: npc.id,
      recruitingPlayerCharacterId: player.id
    })

    const promoted = listPartyMembersForPlayer(db, player.id).find((m) => m.sourceNpcId === npc.id)
    expect(promoted?.ownerPlayerCharacterId).toBe(player.id)
  })
})

describe('party roster combat scope (038.13)', () => {
  it('combat encounter includes only the active player roster', () => {
    const { db, campaign } = seedPartyRosterCampaign()
    const region = createRegion(db, { campaignId: campaign.id, name: 'Field', description: '...' })
    const playerA = createCharacter(db, {
      campaignId: campaign.id,
      name: 'A',
      characterClass: 'fighter',
      kind: 'player',
      stats: { currentRegionId: region.id, abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 } }
    })
    const playerB = createCharacter(db, {
      campaignId: campaign.id,
      name: 'B',
      characterClass: 'mage',
      kind: 'player',
      stats: { currentRegionId: region.id }
    })
    const ownedByA = createCharacter(db, {
      campaignId: campaign.id,
      name: 'A-Member',
      characterClass: 'cleric',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: playerA.id
    })
    createCharacter(db, {
      campaignId: campaign.id,
      name: 'B-Member',
      characterClass: 'rogue',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: playerB.id
    })
    const shared = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Shared',
      characterClass: 'ranger',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: null
    })

    const refs = collectEncounterCombatants(db, region.id, playerA)
    const partyIds = refs.filter((r) => r.kind === 'ai_party_member').map((r) => r.id)
    expect(partyIds).toContain(ownedByA.id)
    expect(partyIds).toContain(shared.id)
    expect(partyIds).toHaveLength(2)
  })
})
