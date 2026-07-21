import { describe, expect, it } from 'vitest'
import { createTestDb } from '../../db/testUtils'
import { createCampaign } from '../../db/repositories/campaigns'
import type { Bucket } from '../../shared/catalogTaxonomy'
import { createScriptedProvider } from '../providers/mockHarness'
import { generateOrGetBestiarySpecies } from './generateSpecies'

const PRESET_LORE =
  'Rift-beasts stalk the torn edges of the world, hunting in packs near planar scars. Locals know them by the low howl that carries before a storm of violet light.'

const LLM_LORE_RESPONSE = JSON.stringify({
  baseLore:
    'These beasts roam the wilds near open rifts, drawn to the scent of planar bleed. Hunters speak of eyes that catch purple fire when the veil thins.'
})

function seedCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Species Pipeline Test',
    premisePrompt: 'Rifts tear the land and beasts spill through.',
    deathMode: 'legendary'
  })
  return { db, campaign }
}

const BEAST_PACK = {
  buckets: ['beast'] as Bucket[],
  tags: ['pack-hunter'],
  levelHint: 3
}

describe('generateOrGetBestiarySpecies retrieval + create', () => {
  it('retrieval match creates species with catalog key and lore', async () => {
    const { db, campaign } = seedCampaign()
    const provider = createScriptedProvider([LLM_LORE_RESPONSE])

    const result = await generateOrGetBestiarySpecies(db, provider, {
      campaignId: campaign.id,
      name: 'Rift-beast',
      ...BEAST_PACK,
      settingHints: 'Near planar rifts'
    })

    expect(result.created).toBe(true)
    expect(result.species.name).toBe('Rift-beast')
    expect(result.species.key).toBe('rift-beast')
    expect(result.species.baseLore.length).toBeGreaterThan(0)
    expect(result.catalogKey).toBeTruthy()
    expect(result.species.defaultCatalogKey).toBe(result.catalogKey)
    expect(result.variants.some((v) => v.variantKey === 'standard')).toBe(true)
    expect(provider.calls.length).toBe(1)
  })

  it('LLM lore path returns non-empty lore', async () => {
    const { db, campaign } = seedCampaign()
    const provider = createScriptedProvider([LLM_LORE_RESPONSE])

    const result = await generateOrGetBestiarySpecies(db, provider, {
      campaignId: campaign.id,
      name: 'Shadow Hound',
      buckets: ['beast'],
      tags: ['pack-hunter'],
      levelHint: 2
    })

    expect(result.created).toBe(true)
    expect(result.species.baseLore.trim().length).toBeGreaterThan(0)
    expect(result.species.key).toBe('shadow-hound')
  })
})

describe('generateOrGetBestiarySpecies dedup + preset', () => {
  it('second call with same key returns existing without LLM', async () => {
    const { db, campaign } = seedCampaign()
    const provider = createScriptedProvider([LLM_LORE_RESPONSE])

    const first = await generateOrGetBestiarySpecies(db, provider, {
      campaignId: campaign.id,
      name: 'Rift-beast',
      ...BEAST_PACK
    })
    expect(first.created).toBe(true)

    const second = await generateOrGetBestiarySpecies(db, provider, {
      campaignId: campaign.id,
      name: 'Rift-beast',
      speciesKey: 'rift-beast',
      buckets: ['beast']
    })

    expect(second.created).toBe(false)
    expect(second.species.id).toBe(first.species.id)
    expect(second.species.baseLore).toBe(first.species.baseLore)
    expect(provider.calls.length).toBe(1)
  })

  it('presetLore skips LLM entirely', async () => {
    const { db, campaign } = seedCampaign()
    const provider = createScriptedProvider([])

    const result = await generateOrGetBestiarySpecies(db, provider, {
      campaignId: campaign.id,
      name: 'Rift-beast',
      ...BEAST_PACK,
      presetLore: PRESET_LORE
    })

    expect(result.created).toBe(true)
    expect(result.species.baseLore).toBe(PRESET_LORE)
    expect(provider.calls.length).toBe(0)
  })
})

describe('generateOrGetBestiarySpecies no combat stats', () => {
  it('species record has no HP/AC combat fields', async () => {
    const { db, campaign } = seedCampaign()
    const provider = createScriptedProvider([])

    const result = await generateOrGetBestiarySpecies(db, provider, {
      campaignId: campaign.id,
      name: 'Rift-beast',
      ...BEAST_PACK,
      presetLore: PRESET_LORE
    })

    const speciesKeys = Object.keys(result.species)
    expect(speciesKeys).not.toContain('hp')
    expect(speciesKeys).not.toContain('ac')
    expect(speciesKeys).not.toContain('maxHp')
    expect(speciesKeys).not.toContain('attackBonus')
    expect(speciesKeys).not.toContain('damage')

    const columns = db.prepare('PRAGMA table_info(bestiary_species)').all() as Array<{ name: string }>
    const columnNames = columns.map((c) => c.name)
    expect(columnNames).not.toContain('hp')
    expect(columnNames).not.toContain('ac')
    expect(columnNames).not.toContain('max_hp')
  })

  it('strips combat numbers from LLM lore payload and still persists lore', async () => {
    const { db, campaign } = seedCampaign()
    const provider = createScriptedProvider([
      JSON.stringify({
        baseLore: 'A cunning pack predator of the border woods.',
        hp: 42,
        ac: 15,
        damage: '2d6+3'
      })
    ])

    const result = await generateOrGetBestiarySpecies(db, provider, {
      campaignId: campaign.id,
      name: 'Border Wolf',
      ...BEAST_PACK
    })

    expect(result.species.baseLore).toContain('pack predator')
    expect(Object.keys(result.species)).not.toContain('hp')
    expect(Object.keys(result.species)).not.toContain('ac')
  })
})
