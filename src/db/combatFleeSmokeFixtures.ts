import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createRegion } from './repositories/regions'
import { createNpc, setNpcCombatStats } from './repositories/npcs'
import { createPlayerCharacter } from '../main/characterCreationIpc'
import { createActiveEncounter } from './repositories/combatEncounters'
import { updateCharacter } from './repositories/characters'

export function seedCombatFleeSmokeCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Flee Smoke',
    premisePrompt: 'A skirmish in the cellar',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Cellar',
    description: 'Stone steps lead up to a heavy door.'
  })
  const player = createPlayerCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    archetype: 'rogue',
    abilityScores: { body: 12, agility: 16, mind: 10, presence: 10 },
    alignment: 'chaotic_good'
  })
  updateCharacter(db, player.id, {
    hp: 20,
    stats: { ...(player.stats as object), currentRegionId: region.id, maxHp: 20 }
  })
  const goblin = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Goblin Scout',
    role: 'hostile',
    disposition: 'hostile',
    temperament: 'aggressive',
    canSpeak: false
  })
  setNpcCombatStats(db, goblin.id, { hp: 6, maxHp: 6, ac: 12 })
  db.prepare('UPDATE npcs SET attack_bonus = 3 WHERE id = ?').run(goblin.id)

  const encounter = createActiveEncounter(db, {
    campaignId: campaign.id,
    initiativeOrder: [
      { combatant: { kind: 'player', id: player.id }, roll: 18 },
      { combatant: { kind: 'npc', id: goblin.id }, roll: 12 }
    ],
    participantIds: [
      { kind: 'player', id: player.id },
      { kind: 'npc', id: goblin.id }
    ]
  })

  return { db, campaign, region, player, goblin, encounter }
}
