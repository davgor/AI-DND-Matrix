import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createNpc } from '../db/repositories/npcs'
import { createPlayerCharacter } from './characterCreationIpc'
import { getCharacterById } from '../db/repositories/characters'
import { createSaveSnapshot } from '../db/repositories/saves'
import { applyPlayerDefeatOutcome, getPlayerDefeatState, isPlayerImprisoned } from './playerDefeat'

function seedDefeatFixture() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Test',
    premisePrompt: 'A town',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A town'
  })
  const player = createPlayerCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    archetype: 'fighter',
    alignment: 'true_neutral',
    abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 }
  })
  const victor = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mara',
    role: 'guard',
    disposition: 'hostile',
    alignment: 'lawful_good',
    backstory: 'Retired guard captain.',
    canSpeak: true
  })
  return { db, campaign, player, victor }
}

describe('applyPlayerDefeatOutcome imprison', () => {
  it('persists flag and gates play context', () => {
    const { db, campaign, player, victor } = seedDefeatFixture()
    applyPlayerDefeatOutcome({
      db,
      campaignId: campaign.id,
      characterId: player.id,
      victorNpcId: victor.id,
      deathMode: 'legendary',
      proposal: {
        disposition: 'imprison',
        narrationText: 'Iron cuffs close around your wrists.'
      }
    })
    const updated = getCharacterById(db, player.id) as NonNullable<ReturnType<typeof getCharacterById>>
    expect(isPlayerImprisoned(updated)).toBe(true)
    expect(getPlayerDefeatState(updated)?.disposition).toBe('imprison')
  })
})

describe('applyPlayerDefeatOutcome bury_out_back', () => {
  it('under standard death mode reverts', () => {
    const { db, campaign, player, victor } = seedDefeatFixture()
    db.prepare('UPDATE campaigns SET death_mode = ? WHERE id = ?').run('standard', campaign.id)
    createSaveSnapshot(db, campaign.id)
    db.prepare('UPDATE characters SET hp = 0 WHERE id = ?').run(player.id)
    const result = applyPlayerDefeatOutcome({
      db,
      campaignId: campaign.id,
      characterId: player.id,
      victorNpcId: victor.id,
      deathMode: 'standard',
      proposal: {
        disposition: 'bury_out_back',
        narrationText: 'Cold earth covers you.'
      }
    })
    expect(result.dyingResolution?.status).toBe('reverted')
    expect(getPlayerDefeatState(getCharacterById(db, player.id) as NonNullable<ReturnType<typeof getCharacterById>>)).toBeNull()
  })
})

describe('applyPlayerDefeatOutcome execute', () => {
  it('under legendary marks permanent death', () => {
    const { db, campaign, player, victor } = seedDefeatFixture()
    const result = applyPlayerDefeatOutcome({
      db,
      campaignId: campaign.id,
      characterId: player.id,
      victorNpcId: victor.id,
      deathMode: 'legendary',
      proposal: {
        disposition: 'execute',
        narrationText: 'The blade falls.'
      }
    })
    expect(result.dyingResolution?.status).toBe('permanently_dead')
  })
})
