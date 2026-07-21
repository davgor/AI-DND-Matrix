import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createBestiarySpecies } from './bestiary'
import {
  appendBestiaryDiscoveredFact,
  assertNonEmptyBaseLore,
  getBestiarySpeciesGrounding,
  listBestiaryDiscoveredFacts
} from './bestiaryKnowledge'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { createLogEntry } from './logEntries'
import { createNpc } from './npcs'
import { createRegion } from './regions'

type TestDb = ReturnType<typeof createTestDb>

function seed(db: TestDb) {
  const campaign = createCampaign(db, {
    name: 'Knowledge Test',
    premisePrompt: 'Beasts and lore.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Wilds',
    description: 'Open country'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  return { campaign, region, hero }
}

function createSpecies(
  db: TestDb,
  campaignId: string,
  opts: { key: string; name: string; baseLore: string }
) {
  return createBestiarySpecies(db, {
    campaignId,
    key: opts.key,
    name: opts.name,
    baseLore: opts.baseLore,
    buckets: ['beast'],
    tags: [opts.key]
  })
}

describe('assertNonEmptyBaseLore', () => {
  it('trims and returns non-empty lore', () => {
    expect(assertNonEmptyBaseLore('  Born of rifts.  ')).toBe('Born of rifts.')
  })

  it('throws on empty or whitespace-only lore', () => {
    expect(() => assertNonEmptyBaseLore('')).toThrow(/base lore/i)
    expect(() => assertNonEmptyBaseLore('   ')).toThrow(/base lore/i)
  })
})

describe('create rejects empty base lore', () => {
  it('throws when baseLore is whitespace', () => {
    const db = createTestDb()
    const { campaign } = seed(db)
    expect(() =>
      createBestiarySpecies(db, {
        campaignId: campaign.id,
        key: 'rift-beast',
        name: 'Rift-beast',
        baseLore: '   ',
        buckets: ['beast'],
        tags: ['rift']
      })
    ).toThrow(/base lore/i)
  })
})

describe('grounding after append', () => {
  it('returns same baseLore plus new beast fact', () => {
    const db = createTestDb()
    const { campaign, hero } = seed(db)
    const baseLore = 'Born of torn planar fabric, they hunt in packs near rifts.'
    const species = createSpecies(db, campaign.id, {
      key: 'rift-beast',
      name: 'Rift-beast',
      baseLore
    })
    const fact = appendBestiaryDiscoveredFact(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      speciesId: species.id,
      title: 'Pack tactics',
      content: 'They flank weaker prey first.'
    })
    expect(fact.category).toBe('beast')
    expect(fact.relatedEntityId).toBe(species.id)
    expect(getBestiarySpeciesGrounding(db, species.id, hero.id)).toEqual({
      baseLore,
      discoveredFacts: [fact]
    })
  })
})

describe('append leaves base_lore column unchanged', () => {
  it('keeps SQL base_lore after fact append', () => {
    const db = createTestDb()
    const { campaign, hero } = seed(db)
    const baseLore = 'Immutable grounding text for the species.'
    const species = createSpecies(db, campaign.id, {
      key: 'blue-slime',
      name: 'Blue slime',
      baseLore
    })
    appendBestiaryDiscoveredFact(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      speciesId: species.id,
      title: 'Weak to fire',
      content: 'Flames make them recoil.'
    })
    const row = db
      .prepare('SELECT base_lore FROM bestiary_species WHERE id = ?')
      .get(species.id) as { base_lore: string }
    expect(row.base_lore).toBe(baseLore)
  })
})

describe('grounding without characterId', () => {
  it('returns base lore and empty facts', () => {
    const db = createTestDb()
    const { campaign } = seed(db)
    const species = createSpecies(db, campaign.id, {
      key: 'rift-beast',
      name: 'Rift-beast',
      baseLore: 'They hunt near rifts.'
    })
    expect(getBestiarySpeciesGrounding(db, species.id)).toEqual({
      baseLore: 'They hunt near rifts.',
      discoveredFacts: []
    })
  })
})

function seedTwoSpeciesWithNoise(db: TestDb) {
  const { campaign, hero } = seed(db)
  const slime = createSpecies(db, campaign.id, {
    key: 'blue-slime',
    name: 'Blue slime',
    baseLore: 'Gelatinous and hungry.'
  })
  const wolf = createSpecies(db, campaign.id, {
    key: 'wolf',
    name: 'Wolf',
    baseLore: 'Pack hunters of the wood.'
  })
  appendBestiaryDiscoveredFact(db, {
    campaignId: campaign.id,
    characterId: hero.id,
    speciesId: slime.id,
    title: 'Splits when struck',
    content: 'Cutting one can yield two smaller ones.'
  })
  appendBestiaryDiscoveredFact(db, {
    campaignId: campaign.id,
    characterId: hero.id,
    speciesId: wolf.id,
    title: 'Howls before pack arrives',
    content: 'A lone howl often precedes reinforcements.'
  })
  createLogEntry(db, {
    campaignId: campaign.id,
    characterId: hero.id,
    category: 'event',
    title: 'Ambush',
    content: 'Not a beast fact.',
    relatedEntityId: slime.id,
    learnedInGameDate: 0
  })
  createLogEntry(db, {
    campaignId: campaign.id,
    characterId: hero.id,
    category: 'beast',
    title: 'Unrelated beast note',
    content: 'No species link.',
    relatedEntityId: null,
    learnedInGameDate: 0
  })
  return { hero, slime, wolf }
}

describe('list isolates by speciesId', () => {
  it('returns only matching beast entries', () => {
    const db = createTestDb()
    const { hero, slime, wolf } = seedTwoSpeciesWithNoise(db)
    const slimeFacts = listBestiaryDiscoveredFacts(db, {
      characterId: hero.id,
      speciesId: slime.id
    })
    expect(slimeFacts).toHaveLength(1)
    expect(slimeFacts[0]?.title).toBe('Splits when struck')
    expect(
      listBestiaryDiscoveredFacts(db, { characterId: hero.id, speciesId: wolf.id })
    ).toHaveLength(1)
  })
})

describe('relatedNpcId provenance', () => {
  it('stores npc id in content; relatedEntityId stays species', () => {
    const db = createTestDb()
    const { campaign, region, hero } = seed(db)
    const slime = createSpecies(db, campaign.id, {
      key: 'blue-slime',
      name: 'Blue slime',
      baseLore: 'Gelatinous and hungry.'
    })
    const instance = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Gloopy',
      role: 'enemy',
      disposition: 'hostile'
    })
    const entry = appendBestiaryDiscoveredFact(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      speciesId: slime.id,
      title: 'Named specimen',
      content: 'This one had a scar across the membrane.',
      relatedNpcId: instance.id
    })
    expect(entry.relatedEntityId).toBe(slime.id)
    expect(entry.content).toContain(instance.id)
    expect(entry.content).toContain('scar')
  })
})
