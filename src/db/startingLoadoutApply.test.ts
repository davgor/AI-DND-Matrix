import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter, getCharacterById } from './repositories/characters'
import { readGuidedCreationFields, setGuidedCreationPhase } from './repositories/guidedCreation'
import { listCharacterItems } from './repositories/characterItems'
import {
  applyStartingLoadout,
  listEquippedAfterLoadout
} from './repositories/startingLoadout'
import { STARTING_OFF_HAND_EMPTY } from '../engine/startingLoadout/packages'

function seedFighter(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Loadout',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    guidedCreationPhase: 'equipment',
    stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 }, ac: 11, maxHp: 12 }
  })
  return { player }
}

describe('applyStartingLoadout fighter', () => {
  it('grants items, equips slots, and advances to identity', () => {
    const db = createTestDb()
    const { player } = seedFighter(db)
    const result = applyStartingLoadout(db, player.id, {
      weaponName: 'Longsword',
      armorName: 'Chain Hauberk',
      offHandChoice: 'Wooden Shield',
      spellKeys: ['rallying-strike']
    })
    expect(result).toEqual({ ok: true })
    expect(readGuidedCreationFields(db, player.id)?.guidedCreationPhase).toBe('companions')
    expect(listEquippedAfterLoadout(db, player.id).map((row) => row.item.name).sort()).toEqual(
      ['Chain Hauberk', 'Longsword', 'Wooden Shield'].sort()
    )
    const updated = getCharacterById(db, player.id)!
    expect(updated.stats.knownSpellKeys).toEqual(['rallying-strike'])
    expect(updated.stats.ac).toBeGreaterThan(11)
    expect(listCharacterItems(db, player.id)).toHaveLength(3)
  })

  it('rejects re-apply after phase advance', () => {
    const db = createTestDb()
    const { player } = seedFighter(db)
    applyStartingLoadout(db, player.id, {
      weaponName: 'Longsword',
      armorName: 'Chain Hauberk',
      offHandChoice: 'Wooden Shield',
      spellKeys: ['rallying-strike']
    })
    const second = applyStartingLoadout(db, player.id, {
      weaponName: 'Handaxe',
      armorName: "Traveler's Leathers",
      offHandChoice: STARTING_OFF_HAND_EMPTY,
      spellKeys: ['rallying-strike']
    })
    expect(second).toEqual({ ok: false, reason: 'invalid_phase' })
  })
})

describe('applyStartingLoadout replace-on-reapply', () => {
  it('replaces prior starting gear when re-applied after phase revert', () => {
    const db = createTestDb()
    const { player } = seedFighter(db)
    expect(
      applyStartingLoadout(db, player.id, {
        weaponName: 'Longsword',
        armorName: 'Chain Hauberk',
        offHandChoice: 'Wooden Shield',
        spellKeys: ['rallying-strike']
      })
    ).toEqual({ ok: true })

    setGuidedCreationPhase(db, player.id, 'equipment')

    expect(
      applyStartingLoadout(db, player.id, {
        weaponName: 'Handaxe',
        armorName: "Traveler's Leathers",
        offHandChoice: STARTING_OFF_HAND_EMPTY,
        spellKeys: ['rallying-strike']
      })
    ).toEqual({ ok: true })

    expect(listCharacterItems(db, player.id).map((row) => row.item.name).sort()).toEqual(
      ['Handaxe', "Traveler's Leathers"].sort()
    )
    expect(listEquippedAfterLoadout(db, player.id).map((row) => row.item.name).sort()).toEqual(
      ['Handaxe', "Traveler's Leathers"].sort()
    )
  })
})

describe('applyStartingLoadout mage', () => {
  it('persists two level-1 spells', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Mage',
      premisePrompt: 'test',
      deathMode: 'legendary'
    })
    const mage = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Lyra',
      characterClass: 'mage',
      kind: 'player',
      guidedCreationPhase: 'equipment',
      stats: { abilityScores: { body: 8, agility: 12, mind: 16, presence: 10 }, ac: 11, maxHp: 6 }
    })
    const result = applyStartingLoadout(db, mage.id, {
      weaponName: 'Dagger',
      armorName: "Traveler's Leathers",
      offHandChoice: STARTING_OFF_HAND_EMPTY,
      spellKeys: ['firebolt', 'arcane-bolt']
    })
    expect(result).toEqual({ ok: true })
    const mageAfter = getCharacterById(db, mage.id)!
    expect((mageAfter.stats as { knownSpellKeys?: string[] }).knownSpellKeys?.sort()).toEqual([
      'arcane-bolt',
      'firebolt'
    ])
  })
})
