import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import {
  createActiveEncounter,
  getActiveEncounter
} from '../db/repositories/combatEncounters'
import { markOwnedCompanionsExitedOnFlee } from './companionFleeFollow'

describe('markOwnedCompanionsExitedOnFlee with living companions', () => {
  it('exits living owned companions with the player', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'C',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    const companion = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Bryn',
      characterClass: 'ranger',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: player.id,
      hp: 10
    })
    const encounter = createActiveEncounter(db, {
      campaignId: campaign.id,
      participantIds: [
        { kind: 'player', id: player.id },
        { kind: 'ai_party_member', id: companion.id },
        { kind: 'npc', id: 'npc-1' }
      ],
      initiativeOrder: [
        { combatant: { kind: 'player', id: player.id }, roll: 15 },
        { combatant: { kind: 'ai_party_member', id: companion.id }, roll: 12 },
        { combatant: { kind: 'npc', id: 'npc-1' }, roll: 10 }
      ]
    })
    markOwnedCompanionsExitedOnFlee(db, encounter, player.id)
    const updated = getActiveEncounter(db, campaign.id)
    expect(updated?.exitedCombatantIds).toEqual(
      expect.arrayContaining([{ kind: 'ai_party_member', id: companion.id }])
    )
  })
})

describe('markOwnedCompanionsExitedOnFlee skip conditions', () => {
  it('skips unconscious or left-behind companions', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'C',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    const downed = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Down',
      characterClass: 'rogue',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: player.id,
      hp: 0
    })
    const left = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Left',
      characterClass: 'mage',
      kind: 'ai_party_member',
      ownerPlayerCharacterId: player.id,
      hp: 8,
      stats: { leftBehind: true }
    })
    const encounter = createActiveEncounter(db, {
      campaignId: campaign.id,
      participantIds: [
        { kind: 'player', id: player.id },
        { kind: 'ai_party_member', id: downed.id },
        { kind: 'ai_party_member', id: left.id }
      ],
      initiativeOrder: [
        { combatant: { kind: 'player', id: player.id }, roll: 15 },
        { combatant: { kind: 'ai_party_member', id: downed.id }, roll: 12 },
        { combatant: { kind: 'ai_party_member', id: left.id }, roll: 10 }
      ]
    })
    markOwnedCompanionsExitedOnFlee(db, encounter, player.id)
    const updated = getActiveEncounter(db, campaign.id)
    expect(updated?.exitedCombatantIds ?? []).toEqual([])
  })
})
