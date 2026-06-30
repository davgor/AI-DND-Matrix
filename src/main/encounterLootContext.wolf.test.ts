import { describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createNpc, setNpcCombatStats, setNpcEncounterOutcome } from '../db/repositories/npcs'
import { upsertCreature } from '../db/catalog/creatures'
import { assembleEncounterLootContext } from './encounterLootContext'
import { makeEncounter, seedEncounterLootBase } from './encounterLootContext.testFixtures'

function seedWolfCatalog(db: Database.Database) {
  upsertCreature(db, {
    key: 'wolf',
    name: 'Wolf',
    buckets: ['beast'],
    levelMin: 1,
    levelMax: 5,
    hp: 10,
    ac: 12,
    abilities: { body: 14, agility: 14, mind: 4, presence: 6 },
    resistances: {},
    damageTypes: [],
    tags: [],
    temperament: 'aggressive',
    canSpeak: false,
    source: 'seed',
    version: 1
  })
}

describe('assembleEncounterLootContext wolf', () => {
  it('slain wolf catalog creature produces beast bucket', () => {
    const { db, campaign, region, player } = seedEncounterLootBase()
    seedWolfCatalog(db)
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
      hp: 10,
      maxHp: 10,
      ac: 12,
      combatTier: 'catalog',
      catalogCreatureKey: 'wolf'
    })
    setNpcEncounterOutcome(db, wolf.id, 'slain')
    const ctx = assembleEncounterLootContext(db, {
      encounter: makeEncounter(campaign.id, [
        { kind: 'player', id: player.id },
        { kind: 'npc', id: wolf.id }
      ]),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(ctx.foes[0]?.buckets).toContain('beast')
  })
})

describe('assembleEncounterLootContext mixed foes', () => {
  it('mixed slain bandit + slain wolf produces two lootable foes', () => {
    const { db, campaign, region, player } = seedEncounterLootBase()
    seedWolfCatalog(db)
    const bandit = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Bandit',
      role: 'thug',
      disposition: 'hostile'
    })
    setNpcEncounterOutcome(db, bandit.id, 'slain')
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
      hp: 10,
      maxHp: 10,
      ac: 12,
      combatTier: 'catalog',
      catalogCreatureKey: 'wolf'
    })
    setNpcEncounterOutcome(db, wolf.id, 'slain')
    const ctx = assembleEncounterLootContext(db, {
      encounter: makeEncounter(campaign.id, [
        { kind: 'player', id: player.id },
        { kind: 'npc', id: bandit.id },
        { kind: 'npc', id: wolf.id }
      ]),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(ctx.foes).toHaveLength(2)
  })
})
