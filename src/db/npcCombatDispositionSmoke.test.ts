import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createRegion } from './repositories/regions'
import { createNpc, getNpcById } from './repositories/npcs'
import { createNpcWithCombatReview } from './repositories/npcCombatHydration'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { proposeDefeatDisposition } from '../agents/defeatDisposition'
import * as retiredAdventurerReview from '../agents/retiredAdventurerReview'
import { applyPlayerDefeatOutcome } from '../main/playerDefeat'
import { createPlayerCharacter } from '../main/characterCreationIpc'
import { computeRetiredAdventurerHp } from '../engine/hp'
import { VILLAGER_STATS } from '../engine/npcCombatStats'
import { getActiveEncounter } from './repositories/combatEncounters'
import { PROVOKE_HOSTILE_DISPOSITION } from '../shared/npcCombat/types'
import { provokeAndAttackNpc } from '../main/npcProvoke'
import type { Character } from './repositories/characters'

function seedRegion() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Smoke',
    premisePrompt: 'A village',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A village'
  })
  const player = createPlayerCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    archetype: 'fighter',
    abilityScores: { body: 16, agility: 12, mind: 10, presence: 10 },
    alignment: 'neutral_good'
  })
  return { db, campaign, region, player }
}

async function expectGuardImprisonsPlayer(
  db: ReturnType<typeof createTestDb>,
  campaign: ReturnType<typeof createCampaign>,
  region: ReturnType<typeof createRegion>,
  player: Character
) {
  const guard = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Captain Mara',
    role: 'guard captain',
    disposition: 'hostile',
    alignment: 'lawful_good',
    backstory: 'Mara led the town guard for twenty years before retiring.',
    canSpeak: true
  })
  // 040.8: rules-first — lawful law-keeper backstory resolves without the LLM.
  const guardProvider = createScriptedProvider([])
  const guardProposal = await proposeDefeatDisposition(guardProvider, {
    victor: guard,
    player,
    deathMode: campaign.deathMode,
    encounterSummary: 'Lost to the guard captain.'
  })
  expect(guardProposal.disposition).toBe('imprison')
  expect(guardProvider.calls).toHaveLength(0)
  const imprison = applyPlayerDefeatOutcome({
    db,
    campaignId: campaign.id,
    characterId: player.id,
    victorNpcId: guard.id,
    deathMode: 'legendary',
    proposal: guardProposal
  })
  expect(imprison.outcome.disposition).toBe('imprison')
}

async function expectBanditBuriesPlayer(
  db: ReturnType<typeof createTestDb>,
  campaign: ReturnType<typeof createCampaign>,
  region: ReturnType<typeof createRegion>,
  player: Character
) {
  const bandit = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Silas',
    role: 'reformed bandit',
    disposition: 'hostile',
    alignment: 'chaotic_good',
    backstory: 'A former bandit who went straight after a decade on the road.',
    canSpeak: true
  })
  // 040.8: rules-first — good-aligned outlaw backstory resolves without the LLM.
  const banditProvider = createScriptedProvider([])
  const banditProposal = await proposeDefeatDisposition(banditProvider, {
    victor: bandit,
    player,
    deathMode: campaign.deathMode,
    encounterSummary: 'Lost to the reformed bandit.'
  })
  expect(banditProposal.disposition).toBe('bury_out_back')
  expect(banditProvider.calls).toHaveLength(0)
}

describe('npc combat disposition smoke scenario A', () => {
  it('mundane villager stays villager and is provokable without review at combat start', async () => {
    const { db, campaign, region, player } = seedRegion()
    const farmer = await createNpcWithCombatReview(
      db,
      createScriptedProvider(['{"upgrade":false}']),
      {
        campaignId: campaign.id,
        regionId: region.id,
        name: 'Tom Baker',
        role: 'baker',
        disposition: 'friendly',
        alignment: 'neutral_good',
        backstory: 'Tom has baked bread in Oakhollow for thirty years.',
        canSpeak: true
      }
    )
    expect(farmer.combatTier).toBe('villager')
    expect(farmer.hp).toBe(VILLAGER_STATS.hp)

    const reviewSpy = vi.spyOn(retiredAdventurerReview, 'reviewRetiredAdventurer')
    reviewSpy.mockClear()

    const provoke = await provokeAndAttackNpc({
      db,
      campaignId: campaign.id,
      regionId: region.id,
      player,
      targetNpcId: farmer.id,
      rng: () => 0.99
    })
    expect(reviewSpy).not.toHaveBeenCalled()
    reviewSpy.mockRestore()

    expect(provoke.npc.disposition).toBe(PROVOKE_HOSTILE_DISPOSITION)
    expect(provoke.encounterStarted).toBe(true)
    expect(getActiveEncounter(db, campaign.id)).toBeDefined()
  })
})

describe('npc combat disposition smoke scenario B', () => {
  it('veteran upgrades at creation without combat-start review', async () => {
    const { db, campaign, region } = seedRegion()
    const guard = await createNpcWithCombatReview(
      db,
      createScriptedProvider(['{"upgrade":true,"profile":"veteran"}']),
      {
        campaignId: campaign.id,
        regionId: region.id,
        name: 'Captain Mara',
        role: 'guard captain',
        disposition: 'dutiful',
        alignment: 'lawful_good',
        backstory: 'Mara led the town guard for twenty years before retiring.',
        canSpeak: true
      }
    )
    const veteranHp = computeRetiredAdventurerHp(guard.id, 'veteran')
    const refreshed = getNpcById(db, guard.id)!
    expect(refreshed.combatTier).toBe('retired_adventurer')
    expect(refreshed.hp).toBe(veteranHp.maxHp)
    expect(refreshed.hp).toBeGreaterThan(VILLAGER_STATS.hp)
  })
})

describe('npc combat disposition smoke scenario C', () => {
  it('defeat dispositions follow backstory and alignment', async () => {
    const { db, campaign, region, player } = seedRegion()
    await expectGuardImprisonsPlayer(db, campaign, region, player)
    await expectBanditBuriesPlayer(db, campaign, region, player)
  })
})
