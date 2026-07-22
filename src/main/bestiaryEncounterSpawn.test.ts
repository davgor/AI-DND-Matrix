import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTestDb } from '../db/testUtils'
import { createCampaign, getCampaignById } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createCharacter } from '../db/repositories/characters'
import {
  createBestiarySpecies,
  getBestiarySpeciesById,
  listBestiarySpecies
} from '../db/repositories/bestiary'
import { getNpcById, listNpcsByRegion } from '../db/repositories/npcs'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { createMockImageProvider } from '../shared/imageGeneration'
import {
  deriveProvisionalHostileName,
  detectThematicSignal,
  findMatchingBestiarySpecies,
  spawnOnDemandEncounterHostiles,
  type OnDemandSpawnInput
} from './bestiaryEncounterSpawn'
import {
  type CreatureTokenSchedulerDeps
} from './creatureTokenScheduler'

const PRESET_LORE =
  'Wolves hunt the borderlands in packs, circling travelers before the first bite falls.'

const PRESET_APPEARANCE = {
  silhouette: 'quadruped canine',
  sizeClass: 'medium',
  primaryColors: ['grey'],
  distinguishingMarks: null,
  textureOrMaterial: 'matted fur'
}

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function buildCreatureTokenDeps(
  db: ReturnType<typeof createTestDb>,
  baseDir: string
): CreatureTokenSchedulerDeps {
  const provider = createMockImageProvider({
    mode: 'success',
    mimeType: 'image/png',
    bytesBase64: PNG_BASE64
  })
  return {
    db,
    getCampaign: (id) => getCampaignById(db, id),
    getSpecies: (id) => getBestiarySpeciesById(db, id),
    imageProvider: provider,
    baseDir,
    logger: { warn: vi.fn(), error: vi.fn() }
  }
}

async function flushCreatureTokenJobs(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

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
    const provider = createScriptedProvider([
      JSON.stringify({ baseLore: PRESET_LORE, visualAppearance: PRESET_APPEARANCE })
    ])
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

describe('spawnOnDemand creature token scheduling', () => {
  it('enqueues after new species create and spawn when toggle is ON', async () => {
    const scene = seedScene()
    scene.db
      .prepare('UPDATE campaigns SET enemy_token_generation_enabled = 1 WHERE id = ?')
      .run(scene.campaign.id)
    const baseDir = mkdtempSync(join(tmpdir(), 'spawn-creature-token-'))
    const deps = buildCreatureTokenDeps(scene.db, baseDir)
    const provider = createScriptedProvider([
      JSON.stringify({ baseLore: PRESET_LORE, visualAppearance: PRESET_APPEARANCE })
    ])

    try {
      await spawnOnDemandEncounterHostiles(
        baseSpawnInput(scene, {
          provider,
          creatureTokenSchedulerDeps: deps
        })
      )
      await flushCreatureTokenJobs()
      const species = listBestiarySpecies(scene.db, scene.campaign.id)[0]
      expect(species?.creatureTokenPath).toBeTruthy()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('skips enqueue when toggle is OFF', async () => {
    const scene = seedScene()
    const baseDir = mkdtempSync(join(tmpdir(), 'spawn-creature-token-off-'))
    const deps = buildCreatureTokenDeps(scene.db, baseDir)
    const provider = createScriptedProvider([
      JSON.stringify({ baseLore: PRESET_LORE, visualAppearance: PRESET_APPEARANCE })
    ])

    try {
      await spawnOnDemandEncounterHostiles(
        baseSpawnInput(scene, {
          provider,
          creatureTokenSchedulerDeps: deps
        })
      )
      await flushCreatureTokenJobs()
      const species = listBestiarySpecies(scene.db, scene.campaign.id)[0]
      expect(species?.creatureTokenPath).toBeNull()
      expect(deps.imageProvider.generateImage).toBeDefined()
    } finally {
      rmSync(baseDir, { recursive: true, force: true })
    }
  })
})
