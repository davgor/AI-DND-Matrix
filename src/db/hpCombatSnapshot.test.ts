import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createRegion } from './repositories/regions'
import { createNpc } from './repositories/npcs'
import { createActiveEncounter } from './repositories/combatEncounters'
import { buildCombatStateSnapshot } from '../main/combatSnapshot'
import { createPartyMembers, createPlayerCharacter } from '../main/characterCreationIpc'
import { hydrateNpcFromCatalog } from './repositories/npcCombatHydration'
import { getCreatureByKey } from './catalog/creatures'

describe('combat snapshot max HP for party', () => {
  it('shows stats.maxHp for player and AI party members', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'HP', premisePrompt: 'hp', deathMode: 'legendary' })
    createRegion(db, { campaignId: campaign.id, name: 'R', description: 'R' })
    const player = createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      archetype: 'fighter',
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
      alignment: 'neutral_good'
    })
    const [ally] = createPartyMembers(db, {
      campaignId: campaign.id,
      members: [{ name: 'Brom', characterClass: 'cleric', personality: 'calm' }],
      ownerPlayerCharacterId: player.id
    })
    const encounter = createActiveEncounter(db, {
      campaignId: campaign.id,
      participantIds: [
        { kind: 'player', id: player.id },
        { kind: 'ai_party_member', id: ally!.id }
      ],
      initiativeOrder: [
        { combatant: { kind: 'player', id: player.id }, roll: 15 },
        { combatant: { kind: 'ai_party_member', id: ally!.id }, roll: 10 }
      ]
    })

    const snapshot = buildCombatStateSnapshot(db, encounter, player.id)
    const hero = snapshot.combatants.find((c) => c.ref.id === player.id)
    const party = snapshot.combatants.find((c) => c.ref.id === ally!.id)

    expect(hero?.maxHp).toBe((player.stats as { maxHp: number }).maxHp)
    expect(hero?.hp).toBe(player.hp)
    expect(party?.maxHp).toBeGreaterThan(0)
    expect(party?.hp).toBe(party?.maxHp)
  })
})

describe('combat snapshot max HP for catalog monsters', () => {
  it('shows catalog monster maxHp greater than 1', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'HP', premisePrompt: 'hp', deathMode: 'legendary' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'R' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      hp: 12,
      stats: { maxHp: 12, hitDieRolls: [8] }
    })
    const goblin = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Goblin',
      role: 'scout',
      disposition: 'hostile',
      skipCombatHydration: true
    })
    hydrateNpcFromCatalog(db, goblin.id, getCreatureByKey(db, 'goblin-scout')!)
    const encounter = createActiveEncounter(db, {
      campaignId: campaign.id,
      participantIds: [
        { kind: 'player', id: player.id },
        { kind: 'npc', id: goblin.id }
      ],
      initiativeOrder: [
        { combatant: { kind: 'player', id: player.id }, roll: 12 },
        { combatant: { kind: 'npc', id: goblin.id }, roll: 8 }
      ]
    })

    const snapshot = buildCombatStateSnapshot(db, encounter, player.id)
    const monster = snapshot.combatants.find((c) => c.ref.kind === 'npc')
    expect(monster?.maxHp).toBeGreaterThan(1)
  })
})
