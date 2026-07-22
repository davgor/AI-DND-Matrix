import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createCharacter } from '../db/repositories/characters'
import { createNpc, getNpcById, listNpcsByRegion, setNpcCombatStats } from '../db/repositories/npcs'
import { getActiveEncounter } from '../db/repositories/combatEncounters'
import { createBestiarySpecies } from '../db/repositories/bestiary'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from './turnIpc'
import {
  allHostilesDefeated,
  collectEncounterCombatants,
  startEncounter
} from './combatOrchestration'

const WOLF_LORE =
  'Wolves hunt the borderlands in packs, circling travelers before the first bite falls.'

const WOLF_APPEARANCE = {
  silhouette: 'quadruped canine',
  sizeClass: 'medium',
  primaryColors: ['grey'],
  distinguishingMarks: null,
  textureOrMaterial: 'matted fur'
}

function seedPlayerOnlyScene() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Empty Hostiles',
    premisePrompt: 'Rift beasts',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Barley fields',
    description: 'Golden barley beside a rift'
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
      currentRegionId: region.id,
      weaponProficient: true
    }
  })
  return { db, campaign, region, player }
}

describe('allHostilesDefeated', () => {
  it('is false when the encounter has zero NPC participants', () => {
    const { db, campaign, player } = seedPlayerOnlyScene()
    const encounter = {
      id: 'enc-1',
      campaignId: campaign.id,
      phase: 'active' as const,
      round: 1,
      activeTurnIndex: 0,
      initiativeOrder: [{ combatant: { kind: 'player' as const, id: player.id }, roll: 15 }],
      participantIds: [{ kind: 'player' as const, id: player.id }],
      pursuitState: 'engaged' as const,
      exitedCombatantIds: [],
      outcome: undefined,
      startedAt: '2026-07-20T00:00:00.000Z'
    }
    expect(allHostilesDefeated(db, encounter)).toBe(false)
  })
})

describe('collectEncounterCombatants', () => {
  it('treats empty participantNpcIds as omitted and uses region hostiles', () => {
    const { db, region, player } = seedPlayerOnlyScene()
    const goblin = createNpc(db, {
      campaignId: player.campaignId,
      regionId: region.id,
      name: 'Goblin',
      role: 'enemy',
      disposition: 'hostile',
      skipCombatHydration: true
    })
    setNpcCombatStats(db, goblin.id, { hp: 8, maxHp: 8, ac: 12 })

    const withOmitted = collectEncounterCombatants(db, region.id, player)
    const withEmpty = collectEncounterCombatants(db, region.id, player, [])

    expect(withEmpty).toEqual(withOmitted)
    expect(withEmpty.some((ref) => ref.kind === 'npc' && ref.id === goblin.id)).toBe(true)
  })
})

describe('deriveProvisionalHostileName (via spawn)', () => {
  it('names the provisional foe from attack-at phrasing when generation is unavailable', async () => {
    const { db, campaign, region, player } = seedPlayerOnlyScene()
    await startEncounter({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      player,
      playerInput: '*I swing my sword at the nearest beast*',
      rng: () => 0.5
    })
    expect(listNpcsByRegion(db, region.id)[0]?.name.toLowerCase()).toContain('beast')
  })

  it('falls back when no target phrase is present', async () => {
    const { db, campaign, region, player } = seedPlayerOnlyScene()
    await startEncounter({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      player,
      playerInput: 'I draw my sword',
      rng: () => 0.5
    })
    expect(listNpcsByRegion(db, region.id)[0]?.name).toBe('Hostile creature')
  })
})

describe('startEncounter without hostiles (116.8 / 115 fallback)', () => {
  it('spawns catalog-tier hostiles when retrieval matches (wolf → dire-wolf)', async () => {
    const { db, campaign, region, player } = seedPlayerOnlyScene()
    expect(listNpcsByRegion(db, region.id)).toHaveLength(0)
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
    expect(allHostilesDefeated(db, encounter)).toBe(false)
    const spawned = listNpcsByRegion(db, region.id)
    expect(spawned.length).toBeGreaterThan(0)
    expect(spawned[0]?.disposition.toLowerCase().startsWith('hostile')).toBe(true)
    const first = getNpcById(db, spawned[0]!.id)
    expect(first?.combatTier).toBe('catalog')
    expect(first?.catalogCreatureKey).toBe('dire-wolf')
    expect(first?.hp).toBeGreaterThan(0)
  })

  it('keeps provisional villager only when generation is unavailable', async () => {
    const { db, campaign, region, player } = seedPlayerOnlyScene()

    const encounter = await startEncounter({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      player,
      playerInput: 'I swing my sword at the nearest beast',
      rng: () => 0.5
    })

    expect(encounter.phase).toBe('active')
    const spawned = listNpcsByRegion(db, region.id)
    expect(spawned).toHaveLength(1)
    expect(getNpcById(db, spawned[0]!.id)?.combatTier).toBe('villager')
    expect(spawned[0]?.name.toLowerCase()).toContain('beast')
  })
})

describe('resolvePlayerTurn startEncounter without hostiles (116.8)', () => {
  it('returns active combatState with catalog foes when bestiary already seeded', async () => {
    const { db, campaign, region, player } = seedPlayerOnlyScene()
    createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'rift-beast',
      name: 'Rift-beast',
      baseLore: WOLF_LORE,
      buckets: ['beast'],
      tags: ['pack-hunter'],
      defaultCatalogKey: 'dire-wolf',
      variants: [{ variantKey: 'standard', flavorBlurb: 'Typical rift-beast' }]
    })
    const provider = createScriptedProvider([
      '{"intent":{"checkNeeded":false,"combatIntent":"startEncounter"}}'
    ])

    const result = await resolvePlayerTurn(
      db, 
      provider, 
      {
        campaignId: campaign.id,
        characterId: player.id,
        playerInput: '*I swing my sword at the nearest beast*'
      }, { rng: () => 0.5 })

    expect(result.combatState).not.toBeNull()
    expect(result.combatState?.combatants.some((c) => c.ref.kind === 'npc')).toBe(true)
    expect(getActiveEncounter(db, campaign.id)?.phase).toBe('active')
    const spawned = listNpcsByRegion(db, region.id)
    expect(getNpcById(db, spawned[0]!.id)?.combatTier).toBe('catalog')
    expect(provider.calls).toHaveLength(1)
  })
})
