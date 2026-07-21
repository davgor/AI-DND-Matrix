import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createCharacter } from '../db/repositories/characters'
import { createNpc, setNpcCombatStats } from '../db/repositories/npcs'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { startEncounter } from './combatOrchestration'

function seedScene() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Orchestration',
    premisePrompt: 'Test',
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

describe('startEncounter', () => {
  it('is async and starts combat when region hostiles already exist', async () => {
    const { db, campaign, region, player } = seedScene()
    const goblin = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Goblin',
      role: 'enemy',
      disposition: 'hostile',
      skipCombatHydration: true
    })
    setNpcCombatStats(db, goblin.id, { hp: 8, maxHp: 8, ac: 12 })

    const encounter = await startEncounter({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      player,
      rng: () => 0.5
    })

    expect(encounter.phase).toBe('active')
    expect(encounter.participantIds.some((ref) => ref.kind === 'npc' && ref.id === goblin.id)).toBe(
      true
    )
  })

  it('passes provider through for on-demand empty-region spawn', async () => {
    const { db, campaign, region, player } = seedScene()
    const provider = createScriptedProvider([
      JSON.stringify({
        baseLore: 'Wolves circle the road at dusk, soft-footed and hungry.'
      })
    ])

    const encounter = await startEncounter({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      player,
      playerInput: 'I attack the nearest wolf',
      provider,
      rng: () => 0.5
    })

    expect(encounter.phase).toBe('active')
    expect(encounter.participantIds.some((ref) => ref.kind === 'npc')).toBe(true)
  })
})
