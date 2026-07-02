import { describe, expect, it } from 'vitest'
import { getCharacterById, updateCharacter } from '../db/repositories/characters'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { assembleNarrationContext, persistNarrationSideEffects } from './dm'
import { loadKnownSpellsForNarration, persistSpellGrants } from './narrationSpellContext'
import { createRegion } from '../db/repositories/regions'

describe('persistSpellGrants', () => {
  it('appends valid catalog spell keys', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Spells', premisePrompt: 'Hook', deathMode: 'legendary' })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Mage',
      characterClass: 'mage',
      kind: 'player'
    })
    persistSpellGrants(db, hero.id, [{ catalogSpellKey: 'firebolt' }])
    const updated = getCharacterById(db, hero.id)!
    expect((updated.stats as { knownSpellKeys?: string[] }).knownSpellKeys).toEqual(['firebolt'])
  })

  it('ignores invalid keys without corrupting stats', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Spells', premisePrompt: 'Hook', deathMode: 'legendary' })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Mage',
      characterClass: 'mage',
      kind: 'player'
    })
    updateCharacter(db, hero.id, { stats: { ...hero.stats, knownSpellKeys: ['firebolt'] } })
    persistSpellGrants(db, hero.id, [{ catalogSpellKey: 'not-a-spell' }])
    const updated = getCharacterById(db, hero.id)!
    expect((updated.stats as { knownSpellKeys?: string[] }).knownSpellKeys).toEqual(['firebolt'])
  })
})

describe('persistNarrationSideEffects spellGrants', () => {
  it('persists validated spell grants from narration result', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Spells', premisePrompt: 'Hook', deathMode: 'legendary' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'Tower', description: 'Arcane' })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Mage',
      characterClass: 'mage',
      kind: 'player'
    })
    persistNarrationSideEffects(
      db,
      { narrationText: 'You learn a spell.', spellGrants: [{ catalogSpellKey: 'firebolt' }] },
      { campaignId: campaign.id, regionId: region.id, characterId: hero.id }
    )
    const updated = getCharacterById(db, hero.id)!
    expect((updated.stats as { knownSpellKeys?: string[] }).knownSpellKeys).toContain('firebolt')
  })
})

describe('assembleNarrationContext known spells', () => {
  it('includes bounded known spell names when present', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Spells', premisePrompt: 'Hook', deathMode: 'legendary' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'Tower', description: 'Arcane' })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Mage',
      characterClass: 'mage',
      kind: 'player'
    })
    updateCharacter(db, hero.id, {
      stats: {
        ...hero.stats,
        knownSpellKeys: ['firebolt', 'arcane-bolt', 'frost-shard']
      }
    })
    const known = loadKnownSpellsForNarration(db, hero.id)
    expect(known.length).toBeGreaterThan(0)
    const context = assembleNarrationContext({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      characterId: hero.id,
      playerInput: 'I cast firebolt'
    })
    expect(context.knownSpells.length).toBeLessThanOrEqual(8)
    expect(context.knownSpells.some((spell) => spell.name === 'Firebolt')).toBe(true)
  })
})
