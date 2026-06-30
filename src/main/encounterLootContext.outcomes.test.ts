import { describe, expect, it } from 'vitest'
import { createNpc, setNpcEncounterOutcome } from '../db/repositories/npcs'
import { assembleEncounterLootContext } from './encounterLootContext'
import { makeEncounter, seedEncounterLootBase } from './encounterLootContext.testFixtures'

describe('assembleEncounterLootContext yield outcomes', () => {
  it('incapacitated and surrendered foes are lootable', () => {
    const { db, campaign, region, player } = seedEncounterLootBase()
    const knocked = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Guard',
      role: 'guard',
      disposition: 'hostile'
    })
    setNpcEncounterOutcome(db, knocked.id, 'incapacitated')
    const surrendered = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Cultist',
      role: 'cultist',
      disposition: 'hostile'
    })
    setNpcEncounterOutcome(db, surrendered.id, 'surrender')
    const ctx = assembleEncounterLootContext(db, {
      encounter: makeEncounter(campaign.id, [
        { kind: 'player', id: player.id },
        { kind: 'npc', id: knocked.id },
        { kind: 'npc', id: surrendered.id }
      ]),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(ctx.foes.map((f) => f.outcome)).toEqual(expect.arrayContaining(['incapacitated', 'surrender']))
  })
})

describe('assembleEncounterLootContext missing outcomes', () => {
  it('excludes NPCs without encounter outcome', () => {
    const { db, campaign, region, player } = seedEncounterLootBase()
    const bystander = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Bystander',
      role: 'civilian',
      disposition: 'neutral'
    })
    const ctx = assembleEncounterLootContext(db, {
      encounter: makeEncounter(campaign.id, [
        { kind: 'player', id: player.id },
        { kind: 'npc', id: bystander.id }
      ]),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(ctx.foes).toHaveLength(0)
  })
})
