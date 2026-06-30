import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createRegion } from './regions'
import { createNpc, getNpcById, setNpcCombatStats } from './npcs'
import {
  createActiveEncounter,
  getActiveEncounter,
  endEncounter
} from './combatEncounters'
import { applyNpcDamage } from './npcs'
import { deleteCampaignCascade } from './deleteCampaign'

describe('combat encounter repository', () => {
  it('enforces one active encounter per campaign', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 'T', deathMode: 'legendary' })
    createActiveEncounter(db, {
      campaignId: campaign.id,
      initiativeOrder: [{ combatant: { kind: 'player', id: 'p1' }, roll: 12 }],
      participantIds: [{ kind: 'player', id: 'p1' }]
    })
    expect(() =>
      createActiveEncounter(db, {
        campaignId: campaign.id,
        initiativeOrder: [],
        participantIds: []
      })
    ).toThrow()
  })

  it('round-trips initiative and ends encounter', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 'T', deathMode: 'legendary' })
    const created = createActiveEncounter(db, {
      campaignId: campaign.id,
      initiativeOrder: [
        { combatant: { kind: 'player', id: 'p1' }, roll: 14 },
        { combatant: { kind: 'npc', id: 'n1' }, roll: 10 }
      ],
      participantIds: [
        { kind: 'player', id: 'p1' },
        { kind: 'npc', id: 'n1' }
      ]
    })
    const active = getActiveEncounter(db, campaign.id)
    expect(active?.initiativeOrder).toHaveLength(2)
    endEncounter(db, created.id, 'defeated')
    expect(getActiveEncounter(db, campaign.id)).toBeUndefined()
  })

  it('deletes encounters with campaign cascade', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 'T', deathMode: 'legendary' })
    createActiveEncounter(db, {
      campaignId: campaign.id,
      initiativeOrder: [],
      participantIds: []
    })
    deleteCampaignCascade(db, campaign.id)
    expect(db.prepare('SELECT COUNT(*) AS c FROM combat_encounters').get()).toEqual({ c: 0 })
  })
})

describe('NPC combat stats', () => {
  it('applies damage and marks slain on encounter outcome', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 'T', deathMode: 'legendary' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'R' })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Goblin',
      role: 'enemy',
      disposition: 'hostile'
    })
    setNpcCombatStats(db, npc.id, { hp: 8, maxHp: 8, ac: 12 })
    expect(applyNpcDamage(db, npc.id, 3)).toBe(5)
    expect(getNpcById(db, npc.id)?.hp).toBe(5)
  })
})
