import { describe, expect, it } from 'vitest'
import { getSpellByKey } from '../db/catalog/spells'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById, updateCharacter } from '../db/repositories/characters'
import { listKnownSpellsForCharacter } from './spellbookIpcHandlers'

describe('spellbook IPC listForCharacter', () => {
  it('resolves known spell keys to catalog metadata', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Spell', premisePrompt: 'Hook', deathMode: 'legendary' })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Mage',
      characterClass: 'mage',
      kind: 'player'
    })
    updateCharacter(db, hero.id, {
      stats: { ...hero.stats, knownSpellKeys: ['firebolt', 'bogus-key'] }
    })
    const spells = listKnownSpellsForCharacter(db, hero.id)
    expect(spells).toHaveLength(1)
    expect(spells[0]?.catalogKey).toBe('firebolt')
    expect(spells[0]?.name).toBe(getSpellByKey(db, 'firebolt')?.name)
  })
})

describe('spellbook IPC character isolation', () => {
  it('returns only the requested character known spells', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Spell', premisePrompt: 'Hook', deathMode: 'legendary' })
    const mage = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Mage',
      characterClass: 'mage',
      kind: 'player'
    })
    const rogue = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Rogue',
      characterClass: 'rogue',
      kind: 'player'
    })
    updateCharacter(db, mage.id, {
      stats: { ...mage.stats, knownSpellKeys: ['firebolt'] }
    })
    expect(listKnownSpellsForCharacter(db, mage.id)).toHaveLength(1)
    expect(listKnownSpellsForCharacter(db, rogue.id)).toHaveLength(0)
    const rogueAfter = getCharacterById(db, rogue.id)!
    expect((rogueAfter.stats as { knownSpellKeys?: string[] }).knownSpellKeys ?? []).toEqual([])
  })
})
