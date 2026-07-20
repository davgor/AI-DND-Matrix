import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createCharacter } from '../db/repositories/characters'
import {
  createBestiarySpecies,
  setQuestFoeAssignment
} from '../db/repositories/bestiary'
import { createNpc, getNpcById, listNpcsByRegion, setNpcCombatStats } from '../db/repositories/npcs'
import { createQuest, upsertCharacterQuest } from '../db/repositories/quests'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import type { Provider } from '../agents/providers/types'
import type { CombatEncounter } from '../shared/combat/types'
import { startEncounter } from './combatOrchestration'

const WOLF_LORE =
  'Wolves hunt the borderlands in packs, circling travelers before the first bite falls.'

vi.mock('../agents/bestiary/generateSpecies', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../agents/bestiary/generateSpecies')>()
  return {
    ...actual,
    generateOrGetBestiarySpecies: vi.fn(async (...args: Parameters<typeof actual.generateOrGetBestiarySpecies>) => {
      generateCallCount += 1
      return actual.generateOrGetBestiarySpecies(...args)
    })
  }
})

let generateCallCount = 0

function seedScene() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Precedence',
    premisePrompt: 'Wolves and quests',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Barley fields',
    description: 'Quiet road'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'David',
    characterClass: 'fighter',
    kind: 'player',
    hp: 10,
    level: 1,
    stats: {
      abilityScores: { body: 15, agility: 14, mind: 12, presence: 13 },
      currentRegionId: region.id
    }
  })
  return { db, campaign, region, player }
}

type Scene = ReturnType<typeof seedScene>

function seedWolfSpecies(db: ReturnType<typeof createTestDb>, campaignId: string) {
  return createBestiarySpecies(db, {
    campaignId,
    key: 'gray-wolf',
    name: 'Gray Wolf',
    baseLore: WOLF_LORE,
    buckets: ['beast'],
    tags: ['pack-hunter'],
    defaultCatalogKey: 'dire-wolf',
    variants: [
      { variantKey: 'standard', flavorBlurb: 'Typical wolf' },
      { variantKey: 'alpha', flavorBlurb: 'Pack leader' }
    ]
  })
}

function seedHostileNpc(scene: Scene, name: string) {
  const npc = createNpc(scene.db, {
    campaignId: scene.campaign.id,
    regionId: scene.region.id,
    name,
    role: 'enemy',
    disposition: 'hostile',
    skipCombatHydration: true
  })
  setNpcCombatStats(scene.db, npc.id, { hp: 8, maxHp: 8, ac: 12 })
  return npc
}

function throwingProvider(): Provider {
  return {
    ...createScriptedProvider([]),
    async generate(): Promise<never> {
      throw new Error('on-demand generate must not run for quest_prep')
    }
  }
}

async function startWithProvider(
  scene: Scene,
  provider: Provider,
  playerInput: string,
  npcIds?: string[]
) {
  return startEncounter({
    db: scene.db,
    campaignId: scene.campaign.id,
    regionId: scene.region.id,
    player: scene.player,
    participantNpcIds: npcIds,
    playerInput,
    provider,
    rng: () => 0.5
  })
}

function seedShadowstalkerQuestPrep(scene: Scene) {
  const species = createBestiarySpecies(scene.db, {
    campaignId: scene.campaign.id,
    key: 'shadowstalker',
    name: 'Shadowstalker',
    baseLore: 'Silent hunters that never match casual attack phrasing.',
    buckets: ['beast'],
    tags: [],
    defaultCatalogKey: 'dire-wolf',
    variants: [
      { variantKey: 'standard', flavorBlurb: 'Typical' },
      { variantKey: 'elite', flavorBlurb: 'Elite stalker' }
    ]
  })
  const quest = createQuest(scene.db, {
    campaignId: scene.campaign.id,
    kind: 'side',
    title: 'End the shadowstalkers',
    summary: 'Clear the nest.',
    regionId: scene.region.id,
    scale: 'minor',
    objectives: [{ id: 'obj-1', text: 'Defeat them', done: false }]
  })
  setQuestFoeAssignment(scene.db, quest.id, [
    {
      speciesId: species.id,
      plannedComposition: {
        slots: [{ speciesKey: 'shadowstalker', variantKey: 'elite', count: 1 }],
        budgetSpent: 2,
        budgetMax: 3
      }
    }
  ])
  upsertCharacterQuest(scene.db, {
    characterId: scene.player.id,
    questId: quest.id,
    status: 'active',
    acceptedInGameDate: 1
  })
  return species
}

function expectNpcInEncounter(encounter: CombatEncounter, npcId: string): void {
  expect(encounter.participantIds.some((ref) => ref.kind === 'npc' && ref.id === npcId)).toBe(true)
  expect(encounter.initiativeOrder.some((entry) => entry.combatant.id === npcId)).toBe(true)
}

function expectQuestPrepElite(encounter: CombatEncounter, scene: Scene, speciesId: string): void {
  expect(generateCallCount).toBe(0)
  const npcRefs = encounter.participantIds.filter((ref) => ref.kind === 'npc')
  expect(npcRefs).toHaveLength(1)
  expect(encounter.round).toBe(1)
  const npc = getNpcById(scene.db, npcRefs[0]!.id)
  expect(npc?.bestiarySpeciesId).toBe(speciesId)
  expect(npc?.bestiaryVariantKey).toBe('elite')
  expect(npc?.combatTier).toBe('catalog')
  expect(encounter.initiativeOrder.some((entry) => entry.combatant.id === npcRefs[0]!.id)).toBe(true)
}

describe('encounter start precedence (116.9)', () => {
  it('explicit_participants: uses supplied NPC ids and skips on-demand generate', async () => {
    generateCallCount = 0
    const scene = seedScene()
    const goblin = seedHostileNpc(scene, 'Named Goblin')
    const provider = createScriptedProvider([JSON.stringify({ baseLore: WOLF_LORE })])
    const encounter = await startWithProvider(scene, provider, 'I swing at the nearest wolf', [
      goblin.id
    ])
    expectNpcInEncounter(encounter, goblin.id)
    expect(generateCallCount).toBe(0)
    expect(listNpcsByRegion(scene.db, scene.region.id)).toHaveLength(1)
  })

  it('region_hostiles: uses existing hostile and skips on-demand generate', async () => {
    generateCallCount = 0
    const scene = seedScene()
    const bandit = seedHostileNpc(scene, 'Bandit')
    const provider = createScriptedProvider([JSON.stringify({ baseLore: WOLF_LORE })])
    const encounter = await startWithProvider(scene, provider, 'I swing at the nearest wolf')
    expect(encounter.participantIds.some((ref) => ref.kind === 'npc' && ref.id === bandit.id)).toBe(
      true
    )
    expect(generateCallCount).toBe(0)
    expect(listNpcsByRegion(scene.db, scene.region.id)).toHaveLength(1)
  })

  it('quest_prep: materializes planned composition without species generate', async () => {
    generateCallCount = 0
    const scene = seedScene()
    const species = seedShadowstalkerQuestPrep(scene)
    expect(listNpcsByRegion(scene.db, scene.region.id)).toHaveLength(0)
    const encounter = await startWithProvider(scene, throwingProvider(), 'I draw my blade and engage')
    expectQuestPrepElite(encounter, scene, species.id)
  })

  it('on_demand: still spawns when no quest prep and empty region', async () => {
    generateCallCount = 0
    const scene = seedScene()
    seedWolfSpecies(scene.db, scene.campaign.id)
    const encounter = await startWithProvider(
      scene,
      createScriptedProvider([]),
      'I swing my sword at the nearest wolf'
    )
    expect(encounter.participantIds.some((ref) => ref.kind === 'npc')).toBe(true)
    const spawned = listNpcsByRegion(scene.db, scene.region.id)
    expect(spawned.length).toBeGreaterThan(0)
    expect(spawned.every((npc) => npc.bestiarySpeciesId != null)).toBe(true)
    expect(generateCallCount).toBe(0)
  })
})
