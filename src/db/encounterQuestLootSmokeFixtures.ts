import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createRegion } from './repositories/regions'
import { createNpc, setNpcCombatStats, setNpcEncounterOutcome } from './repositories/npcs'
import { upsertCreature } from './catalog/creatures'
import type { CombatEncounter } from '../shared/combat/types'

export const WOLF_LOOT_RESPONSE = JSON.stringify({
  narrationText: 'You skin the wolves and collect fangs.',
  itemGrants: [
    {
      proposeNew: {
        name: 'Wolf Fang',
        description: 'A sharp fang trophy.',
        itemType: 'misc',
        rarityTier: 'common'
      }
    },
    {
      proposeNew: {
        name: 'Rough Hide',
        description: 'Tanned beast hide.',
        itemType: 'misc',
        rarityTier: 'common'
      }
    }
  ],
  nothingToFind: false
})

export const BANDIT_LOOT_RESPONSE = JSON.stringify({
  narrationText: 'You find a worn blade on the bandit.',
  itemGrants: [
    {
      proposeNew: {
        name: 'Bandit Blade',
        description: 'A chipped short sword.',
        itemType: 'weapon',
        rarityTier: 'common'
      }
    }
  ],
  nothingToFind: false
})

export const QUEST_LOOT_RESPONSE = JSON.stringify({
  narrationText: 'The miller presses a pouch of coins into your hand.',
  itemGrants: [
    {
      proposeNew: {
        name: 'Miller Coin Pouch',
        description: 'A modest payment.',
        itemType: 'misc',
        rarityTier: 'common'
      }
    }
  ],
  nothingToFind: false
})

export function seedWolfLootEncounter() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Loot', premisePrompt: 'wolves', deathMode: 'standard' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Forest', description: 'Dark woods' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Ranger',
    characterClass: 'ranger',
    kind: 'player',
    level: 2,
    stats: { currentRegionId: region.id }
  })
  upsertCreature(db, {
    key: 'wolf',
    name: 'Wolf',
    buckets: ['beast'],
    levelMin: 1,
    levelMax: 4,
    hp: 8,
    ac: 12,
    abilities: { body: 12, agility: 14, mind: 4, presence: 6 },
    resistances: {},
    damageTypes: [],
    tags: [],
    temperament: 'aggressive',
    canSpeak: false,
    source: 'seed',
    version: 1
  })
  const wolf = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Wolf',
    role: 'predator',
    disposition: 'hostile',
    catalogCreatureKey: 'wolf',
    skipCombatHydration: true
  })
  setNpcCombatStats(db, wolf.id, {
    hp: 0,
    maxHp: 8,
    ac: 12,
    combatTier: 'catalog',
    catalogCreatureKey: 'wolf'
  })
  setNpcEncounterOutcome(db, wolf.id, 'slain')
  const encounter = makeResolvedEncounter(campaign.id, wolf.id, player.id)
  return { db, campaign, region, player, wolf, encounter }
}

export function seedBanditLootEncounter() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Loot', premisePrompt: 'bandits', deathMode: 'standard' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Road', description: 'Dusty road' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Fighter',
    characterClass: 'fighter',
    kind: 'player',
    level: 3,
    stats: { currentRegionId: region.id }
  })
  const bandit = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Bandit',
    role: 'thug',
    disposition: 'hostile'
  })
  setNpcEncounterOutcome(db, bandit.id, 'slain')
  const encounter = makeResolvedEncounter(campaign.id, bandit.id, player.id)
  return { db, campaign, region, player, bandit, encounter }
}

function makeResolvedEncounter(campaignId: string, npcId: string, playerId: string): CombatEncounter {
  return {
    id: `enc-${npcId}`,
    campaignId,
    phase: 'resolved',
    outcome: 'defeated',
    initiativeOrder: [],
    activeTurnIndex: 0,
    round: 1,
    participantIds: [
      { kind: 'player', id: playerId },
      { kind: 'npc', id: npcId }
    ],
    pursuitState: 'engaged',
    exitedCombatantIds: [],
    startedAt: new Date().toISOString()
  }
}
