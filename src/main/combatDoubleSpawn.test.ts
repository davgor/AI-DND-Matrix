import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createCharacter } from '../db/repositories/characters'
import { createBestiarySpecies } from '../db/repositories/bestiary'
import {
  createNpc,
  listNpcsByRegion,
  setNpcCombatStats
} from '../db/repositories/npcs'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { attackRng, initiativeRng } from '../db/combatEncounterSmokeFixtures'
import * as bestiarySpawn from './bestiaryEncounterSpawn'
import { startEncounter } from './combatOrchestration'
import { resolvePlayerTurn } from './turnIpc'

const LORE =
  'Wolves hunt the borderlands in packs, circling travelers before the first bite falls.'

const LORE_APPEARANCE = {
  silhouette: 'quadruped canine',
  sizeClass: 'medium',
  primaryColors: ['grey'],
  distinguishingMarks: null,
  textureOrMaterial: 'matted fur'
}

function seedScene() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Double spawn',
    premisePrompt: 'Wolves',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Road',
    description: 'Dusty road'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player',
    hp: 12,
    level: 1,
    stats: {
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 11 },
      currentRegionId: region.id
    }
  })
  return { db, campaign, region, player }
}

describe('startEncounter double-spawn guard (116.10)', () => {
  it('does not call on-demand spawn when region hostiles already exist', async () => {
    const { db, campaign, region, player } = seedScene()
    const species = createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'gray-wolf',
      name: 'Gray Wolf',
      baseLore: LORE,
      buckets: ['beast'],
      tags: ['pack'],
      defaultCatalogKey: 'dire-wolf',
      variants: [{ variantKey: 'standard', flavorBlurb: 'Typical wolf' }]
    })
    const existing = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Gray Wolf',
      role: 'enemy',
      disposition: 'hostile',
      bestiarySpeciesId: species.id,
      bestiaryVariantKey: 'standard',
      skipCombatHydration: true
    })
    setNpcCombatStats(db, existing.id, { hp: 10, maxHp: 10, ac: 13 })

    const spawnSpy = vi.spyOn(bestiarySpawn, 'spawnOnDemandEncounterHostiles')
    const beforeIds = listNpcsByRegion(db, region.id).map((npc) => npc.id)

    const encounter = await startEncounter({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      player,
      playerInput: 'I attack the wolf',
      provider: createScriptedProvider([
        JSON.stringify({ baseLore: LORE, visualAppearance: LORE_APPEARANCE })
      ]),
      rng: () => 0.5
    })

    expect(listNpcsByRegion(db, region.id).map((npc) => npc.id)).toEqual(beforeIds)
    expect(encounter.participantIds.some((ref) => ref.kind === 'npc' && ref.id === existing.id)).toBe(
      true
    )
    expect(spawnSpy).not.toHaveBeenCalled()
    spawnSpy.mockRestore()
  })
})

describe('attack follow-up on spawned instance (116.10)', () => {
  it('accepts attack with targetNpcId of an on-demand spawned instance', async () => {
    const { db, campaign, region, player } = seedScene()
    createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'rift-beast',
      name: 'Rift-beast',
      baseLore: LORE,
      buckets: ['beast'],
      tags: ['rift'],
      defaultCatalogKey: 'dire-wolf',
      variants: [{ variantKey: 'standard', flavorBlurb: 'Typical rift-beast' }]
    })
    const provider = createScriptedProvider([
      '{"intent":{"checkNeeded":false,"combatIntent":"startEncounter"}}'
    ])

    await resolvePlayerTurn(
      db, 
      provider, 
      {
        campaignId: campaign.id,
        characterId: player.id,
        playerInput: '*I swing my sword at the nearest beast*'
      }, { rng: initiativeRng() })

    const spawned = listNpcsByRegion(db, region.id)
    expect(spawned.length).toBeGreaterThan(0)
    const targetId = spawned[0]!.id
    expect(spawned[0]!.bestiarySpeciesId).not.toBeNull()

    const attackProvider = createScriptedProvider([
      `{"intent":{"checkNeeded":false,"combatIntent":"attack","targetNpcId":"${targetId}"}}`
    ])
    const attackResult = await resolvePlayerTurn(
      db, 
      attackProvider, 
      {
        campaignId: campaign.id,
        characterId: player.id,
        playerInput: 'I strike the beast'
      }, { rng: attackRng(20) })

    expect(attackResult.combatAttack).toBeDefined()
    expect(attackResult.combatAttack?.target).toEqual({ kind: 'npc', id: targetId })
  })
})
