/**
 * Epic 116.12 — end-to-end smoke across prepped / on-quest / on-demand
 * generation points, variant composition, and LLM efficiency ceilings.
 */
import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createCharacter } from '../db/repositories/characters'
import { createQuest } from '../db/repositories/quests'
import {
  listBestiarySpecies,
  listQuestFoeAssignments
} from '../db/repositories/bestiary'
import { getNpcById, listNpcsByRegion } from '../db/repositories/npcs'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { generateOrGetBestiarySpecies } from '../agents/bestiary/generateSpecies'
import { assignQuestFoes } from '../agents/bestiary/assignQuestFoes'
import * as generateSpeciesModule from '../agents/bestiary/generateSpecies'
import { planEncounterComposition } from '../engine/encounterComposition'
import { startEncounter } from './combatOrchestration'

const PRESET_LORE =
  'Rift-beasts stalk the torn edges of the world, hunting in packs near planar scars. Locals know them by the low howl that carries before a storm of violet light.'

const PRESET_APPEARANCE = {
  silhouette: 'quadruped wolf-like',
  sizeClass: 'large',
  primaryColors: ['violet'],
  distinguishingMarks: 'planar scars',
  textureOrMaterial: 'crackling fur'
}

const WOLF_LORE =
  'Wolves hunt the borderlands in packs, circling travelers before the first bite falls.'

const WOLF_APPEARANCE = {
  silhouette: 'quadruped canine',
  sizeClass: 'medium',
  primaryColors: ['grey', 'brown'],
  distinguishingMarks: 'yellow eyes',
  textureOrMaterial: 'matted fur'
}

function seedCampaignScene(level = 5) {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Bestiary Epic Smoke',
    premisePrompt: 'Rift beasts and wolves haunt the borderlands.',
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
      currentRegionId: region.id,
      weaponProficient: true
    }
  })
  return { db, campaign, region, player }
}

describe('116.12 bestiary epic smoke — prepped', () => {
  it('createCampaign + generateOrGet with preset lore → listBestiarySpecies length ≥ 1', async () => {
    const { db, campaign } = seedCampaignScene()
    const provider = createScriptedProvider([])

    const result = await generateOrGetBestiarySpecies(db, provider, {
      campaignId: campaign.id,
      name: 'Rift-beast',
      speciesKey: 'rift-beast',
      buckets: ['beast'],
      tags: ['rift', 'pack-hunter'],
      presetLore: PRESET_LORE,
      presetAppearance: PRESET_APPEARANCE
    })

    expect(result.created).toBe(true)
    expect(listBestiarySpecies(db, campaign.id).length).toBeGreaterThanOrEqual(1)
    expect(provider.calls).toHaveLength(0)
  })
})

describe('116.12 bestiary epic smoke — on quest', () => {
  it('createQuest + assignQuestFoes → assignments nonempty without startEncounter', async () => {
    const { db, campaign } = seedCampaignScene()
    await generateOrGetBestiarySpecies(db, createScriptedProvider([]), {
      campaignId: campaign.id,
      name: 'Rift-beast',
      speciesKey: 'rift-beast',
      buckets: ['beast'],
      tags: ['rift', 'pack-hunter'],
      presetLore: PRESET_LORE,
      presetAppearance: PRESET_APPEARANCE
    })
    const quest = createQuest(db, {
      campaignId: campaign.id,
      kind: 'side',
      title: 'Clear the rift-beasts from the rift',
      summary: 'Drive the pack back through the tear.',
      scale: 'minor',
      objectives: [{ id: 'obj-1', text: 'Clear the rift', done: false }]
    })
    const provider = createScriptedProvider([])

    const assigned = await assignQuestFoes(db, provider, {
      campaignId: campaign.id,
      questId: quest.id,
      title: quest.title,
      summary: quest.summary
    })

    expect(assigned.length).toBeGreaterThanOrEqual(1)
    expect(listQuestFoeAssignments(db, quest.id).length).toBeGreaterThanOrEqual(1)
    expect(db.prepare('SELECT COUNT(*) AS c FROM combat_encounters').get()).toEqual({ c: 0 })
  })
})

describe('116.12 bestiary epic smoke — on demand', () => {
  it('empty region startEncounter with provider → combatants linked to bestiary', async () => {
    const { db, campaign, region, player } = seedCampaignScene(1)
    const provider = createScriptedProvider([
      JSON.stringify({ baseLore: WOLF_LORE, visualAppearance: WOLF_APPEARANCE })
    ])

    const encounter = await startEncounter({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      player,
      playerInput: 'I swing my sword at the nearest wolf',
      provider,
      rng: () => 0.5
    })

    expect(encounter.phase).toBe('active')
    expect(encounter.participantIds.some((ref) => ref.kind === 'npc')).toBe(true)
    const spawned = listNpcsByRegion(db, region.id)
    expect(spawned.length).toBeGreaterThan(0)
    expect(spawned.every((npc) => npc.bestiarySpeciesId != null)).toBe(true)
    expect(listBestiarySpecies(db, campaign.id).length).toBeGreaterThanOrEqual(1)
    expect(getNpcById(db, spawned[0]!.id)?.combatTier).toBe('catalog')
  })
})

describe('116.12 bestiary epic smoke — variants', () => {
  it('planEncounterComposition level-5 wolf includes alpha', () => {
    const plan = planEncounterComposition({
      playerLevel: 5,
      partySize: 1,
      speciesKey: 'wolf'
    })
    const alphaCount = plan.slots
      .filter((s) => s.variantKey === 'alpha')
      .reduce((sum, s) => sum + s.count, 0)
    expect(alphaCount).toBeGreaterThanOrEqual(1)
    expect(plan.budgetSpent).toBeLessThanOrEqual(plan.budgetMax)
  })
})

describe('116.12 bestiary epic smoke — efficiency', () => {
  it('composition planner is sync/pure (0 LLM)', () => {
    const provider = createScriptedProvider([])
    const plan = planEncounterComposition({
      playerLevel: 5,
      partySize: 1,
      speciesKey: 'wolf'
    })
    expect(plan.slots.length).toBeGreaterThan(0)
    expect(provider.calls).toHaveLength(0)
    expect(typeof planEncounterComposition).toBe('function')
    // Sync: no Promise returned
    expect(plan).not.toBeInstanceOf(Promise)
  })

  it('on quest with known rift-beast + existing species → 0 generateOrGet calls', async () => {
    const { db, campaign } = seedCampaignScene()
    await generateOrGetBestiarySpecies(db, createScriptedProvider([]), {
      campaignId: campaign.id,
      name: 'Rift-beast',
      speciesKey: 'rift-beast',
      buckets: ['beast'],
      tags: ['rift', 'pack-hunter'],
      presetLore: PRESET_LORE,
      presetAppearance: PRESET_APPEARANCE
    })
    const quest = createQuest(db, {
      campaignId: campaign.id,
      kind: 'side',
      title: 'Clear the rift-beasts from the rift',
      summary: 'Drive the pack back through the tear.',
      scale: 'minor',
      objectives: [{ id: 'obj-1', text: 'Clear the rift', done: false }]
    })
    const generateSpy = vi.spyOn(generateSpeciesModule, 'generateOrGetBestiarySpecies')
    const provider = createScriptedProvider([])

    try {
      const assigned = await assignQuestFoes(db, provider, {
        campaignId: campaign.id,
        questId: quest.id,
        title: quest.title,
        summary: quest.summary
      })
      expect(assigned.length).toBeGreaterThanOrEqual(1)
      expect(generateSpy).not.toHaveBeenCalled()
      expect(provider.calls).toHaveLength(0)
    } finally {
      generateSpy.mockRestore()
    }
  })
})
