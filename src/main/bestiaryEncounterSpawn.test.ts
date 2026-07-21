import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createCharacter } from '../db/repositories/characters'
import { createBestiarySpecies, listBestiarySpecies } from '../db/repositories/bestiary'
import { getNpcById, listNpcsByRegion } from '../db/repositories/npcs'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import {
  deriveProvisionalHostileName,
  detectThematicSignal,
  findMatchingBestiarySpecies,
  spawnOnDemandEncounterHostiles,
  type OnDemandSpawnInput
} from './bestiaryEncounterSpawn'

const PRESET_LORE =
  'Wolves hunt the borderlands in packs, circling travelers before the first bite falls.'

function seedScene(level = 1) {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'On-demand spawn',
    premisePrompt: 'Rift beasts and wolves',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Barley fields',
    description: 'Golden barley beside a quiet road'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'David',
    characterClass: 'fighter',
    kind: 'player',
    hp: 10,
    level,
    stats: {
      abilityScores: { body: 15, agility: 14, mind: 12, presence: 13 },
      currentRegionId: region.id
    }
  })
  return { db, campaign, region, player }
}

function seedWolfSpecies(
  db: ReturnType<typeof createTestDb>,
  campaignId: string
): void {
  createBestiarySpecies(db, {
    campaignId,
    key: 'gray-wolf',
    name: 'Gray Wolf',
    baseLore: PRESET_LORE,
    buckets: ['beast'],
    tags: ['pack-hunter'],
    defaultCatalogKey: 'dire-wolf',
    variants: [
      { variantKey: 'standard', flavorBlurb: 'Typical wolf' },
      { variantKey: 'alpha', flavorBlurb: 'Pack leader' }
    ]
  })
}

function baseSpawnInput(
  scene: ReturnType<typeof seedScene>,
  overrides: Partial<OnDemandSpawnInput> = {}
): OnDemandSpawnInput {
  const { db, campaign, region, player } = scene
  return {
    db,
    campaignId: campaign.id,
    regionId: region.id,
    playerLevel: player.level,
    partySize: 1,
    playerInput: 'I swing my sword at the nearest wolf',
    regionText: region.description,
    ...overrides
  }
}

describe('deriveProvisionalHostileName / thematic', () => {
  it('pulls a foe label from attack-at phrasing', () => {
    expect(deriveProvisionalHostileName('*I swing at the nearest wolf*')).toMatch(/wolf/i)
  })

  it('detects cursed/blight/rift signals', () => {
    expect(detectThematicSignal(['a cursed grove'])).toBe('cursed')
    expect(detectThematicSignal(['blighted land'])).toBe('blight')
    expect(detectThematicSignal(['near the rift scar'])).toBe('rift')
    expect(detectThematicSignal(['a quiet road'])).toBe('none')
  })
})

describe('findMatchingBestiarySpecies', () => {
  it('matches existing species by name/key substring', () => {
    const { db, campaign } = seedScene()
    seedWolfSpecies(db, campaign.id)
    expect(findMatchingBestiarySpecies(db, campaign.id, 'wolf')?.key).toBe('gray-wolf')
  })
})

describe('spawnOnDemand prefers existing species', () => {
  it('reuses bestiary and skips LLM', async () => {
    const scene = seedScene()
    seedWolfSpecies(scene.db, scene.campaign.id)
    const provider = createScriptedProvider([])
    const outcome = await spawnOnDemandEncounterHostiles(baseSpawnInput(scene, { provider }))

    expect(outcome.kind).toBe('success')
    expect(listBestiarySpecies(scene.db, scene.campaign.id)).toHaveLength(1)
    expect(provider.calls).toHaveLength(0)
    const spawned = listNpcsByRegion(scene.db, scene.region.id)
    expect(spawned.length).toBeGreaterThan(0)
    expect(spawned.every((npc) => npc.bestiarySpeciesId != null)).toBe(true)
    expect(getNpcById(scene.db, spawned[0]!.id)?.combatTier).toBe('catalog')
    expect(getNpcById(scene.db, spawned[0]!.id)?.catalogCreatureKey).toBe('dire-wolf')
  })
})

describe('spawnOnDemand generate + hydrate', () => {
  it('maps wolf retrieval to dire-wolf catalog tier', async () => {
    const scene = seedScene()
    const provider = createScriptedProvider([JSON.stringify({ baseLore: PRESET_LORE })])
    const outcome = await spawnOnDemandEncounterHostiles(baseSpawnInput(scene, { provider }))

    expect(outcome.kind).toBe('success')
    const species = listBestiarySpecies(scene.db, scene.campaign.id)
    expect(species).toHaveLength(1)
    expect(species[0]?.defaultCatalogKey).toBe('dire-wolf')
    const spawned = listNpcsByRegion(scene.db, scene.region.id)
    const first = getNpcById(scene.db, spawned[0]!.id)
    expect(first?.combatTier).toBe('catalog')
    expect(first?.catalogCreatureKey).toBe('dire-wolf')
    expect(first?.hp).toBeGreaterThan(0)
    expect(first?.ac).toBeGreaterThan(0)
  })
})

describe('spawnOnDemand provisional fallback', () => {
  it('uses fallback_provisional when generation is unavailable', async () => {
    const scene = seedScene()
    const outcome = await spawnOnDemandEncounterHostiles(
      baseSpawnInput(scene, {
        provider: undefined,
        playerInput: 'I swing at the nearest beast'
      })
    )

    expect(outcome.kind).toBe('fallback_provisional')
    const id = outcome.kind === 'fallback_provisional' ? outcome.instanceNpcIds[0]! : ''
    const npc = getNpcById(scene.db, id)
    expect(npc?.combatTier).toBe('villager')
    expect(npc?.name.toLowerCase()).toContain('beast')
  })
})
