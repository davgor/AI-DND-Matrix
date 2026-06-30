import { describe, expect, it } from 'vitest'
import { createNpc, setNpcEncounterOutcome } from '../db/repositories/npcs'
import { assembleEncounterLootContext } from './encounterLootContext'
import { makeEncounter, seedEncounterLootBase } from './encounterLootContext.testFixtures'

describe('assembleEncounterLootContext bandit', () => {
  it('slain bandit produces humanoid foe with slain outcome', () => {
    const { db, campaign, region, player } = seedEncounterLootBase()
    const bandit = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Bandit',
      role: 'thug',
      disposition: 'hostile'
    })
    setNpcEncounterOutcome(db, bandit.id, 'slain')
    const ctx = assembleEncounterLootContext(db, {
      encounter: makeEncounter(campaign.id, [
        { kind: 'player', id: player.id },
        { kind: 'npc', id: bandit.id }
      ]),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(ctx.source).toBe('encounter_end')
    expect(ctx.foes[0]).toMatchObject({ outcome: 'slain', buckets: ['humanoid'] })
  })
})
