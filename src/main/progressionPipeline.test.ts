import { afterEach, describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createNpc, setNpcEncounterOutcome } from '../db/repositories/npcs'
import { listEventsByCampaign } from '../db/repositories/events'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { clampXPProposal, resolveXPBudget } from '../engine/xpBudget'
import { xpNarrationTemplate } from './rewardNarrationTemplates'
import {
  assertNoPendingLevelUp,
  getPendingLevelUpCeremony,
  LevelUpPendingError,
  runEncounterXpPass
} from './progressionPipeline'
import type { CombatEncounter } from '../shared/combat/types'

const XP_RESPONSE = JSON.stringify({ narrationText: 'You learn from battle.', xpAmount: 80 })
const LEVEL_UP_RESPONSE = JSON.stringify({
  narrationText: 'You grow stronger.',
  perks: [
    { id: 'a', name: 'A', description: 'a', category: 'ac_bonus', flavorTags: ['martial'] },
    { id: 'b', name: 'B', description: 'b', category: 'extra_attack', flavorTags: ['combat'] },
    { id: 'c', name: 'C', description: 'c', category: 'hp_max_bonus', flavorTags: [] }
  ]
})

const originalEnrichment = process.env['ENRICH_REWARD_NARRATION']

afterEach(() => {
  if (originalEnrichment === undefined) {
    delete process.env['ENRICH_REWARD_NARRATION']
  } else {
    process.env['ENRICH_REWARD_NARRATION'] = originalEnrichment
  }
})

function makeEncounter(campaignId: string, npcId: string, playerId: string): CombatEncounter {
  return {
    id: 'enc-1',
    campaignId,
    phase: 'resolved',
    outcome: 'defeated',
    initiativeOrder: [],
    activeTurnIndex: 0,
    round: 2,
    participantIds: [
      { kind: 'player', id: playerId },
      { kind: 'npc', id: npcId }
    ],
    pursuitState: 'engaged',
    exitedCombatantIds: [],
    startedAt: new Date().toISOString()
  }
}

function seedEncounterFixture(playerXp: number) {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'T', premisePrompt: 't', deathMode: 'standard' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'd' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player',
    level: 1,
    xp: playerXp
  })
  const bandit = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Bandit',
    role: 'thug',
    disposition: 'hostile'
  })
  setNpcEncounterOutcome(db, bandit.id, 'slain')
  return { db, campaign, region, player, bandit }
}

// Engine budget for the fixture encounter: one slain villager-tier foe, round 2, level 1.
function fixtureBudget(playerId: string, banditId: string, campaignId: string) {
  return resolveXPBudget({
    source: 'encounter_end',
    foes: [{ npcId: banditId, npcRole: 'thug', combatTier: 'villager', buckets: ['humanoid'], outcome: 'slain' }],
    regionId: 'r',
    playerLevel: 1,
    playerCharacterId: playerId,
    campaignId,
    roundCount: 2
  })
}

describe('progression pipeline — default zero-LLM XP path', () => {
  it('awards budget.suggested with template narration and no XP LLM call', async () => {
    delete process.env['ENRICH_REWARD_NARRATION']
    const { db, campaign, region, player, bandit } = seedEncounterFixture(280)
    const budget = fixtureBudget(player.id, bandit.id, campaign.id)

    // Only the level-up ceremony agent should be consulted — never the XP agent.
    const provider = createScriptedProvider([LEVEL_UP_RESPONSE])
    const xp = await runEncounterXpPass({
      db,
      provider,
      encounter: makeEncounter(campaign.id, bandit.id, player.id),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(xp?.xpAmount).toBe(budget.suggested)
    expect(xp?.xpNarration).toBe(xpNarrationTemplate('encounter_end'))
    // 040.9: the XP agent's instruction lives in systemPrompt now.
    expect(
      provider.calls.every((call) => !(call.context?.systemPrompt ?? '').includes('Propose xpAmount'))
    ).toBe(true)

    const updated = getCharacterById(db, player.id)!
    expect(updated.level).toBe(2)
    const pending = getPendingLevelUpCeremony(db, player.id)
    expect(pending?.perks).toHaveLength(3)
    expect(() => assertNoPendingLevelUp(db, player.id)).toThrow(LevelUpPendingError)
  })

  it('persists xp_awarded with clamped always false on the default path', async () => {
    delete process.env['ENRICH_REWARD_NARRATION']
    const { db, campaign, region, player, bandit } = seedEncounterFixture(0)
    const xp = await runEncounterXpPass({
      db,
      provider: createScriptedProvider([]),
      encounter: makeEncounter(campaign.id, bandit.id, player.id),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(xp).not.toBeNull()
    const event = listEventsByCampaign(db, campaign.id).find((e) => e.type === 'xp_awarded')
    expect(event?.payload.clamped).toBe(false)
    expect(event?.payload.amount).toBe(xp?.xpAmount)
  })
})

describe('progression pipeline — enrichment restores LLM flavor', () => {
  it('calls the XP agent and clamps its proposal when ENRICH_REWARD_NARRATION=true', async () => {
    process.env['ENRICH_REWARD_NARRATION'] = 'true'
    const { db, campaign, region, player, bandit } = seedEncounterFixture(280)
    const budget = fixtureBudget(player.id, bandit.id, campaign.id)

    const provider = createScriptedProvider([XP_RESPONSE, LEVEL_UP_RESPONSE, LEVEL_UP_RESPONSE])
    const xp = await runEncounterXpPass({
      db,
      provider,
      encounter: makeEncounter(campaign.id, bandit.id, player.id),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(provider.calls[0]?.context?.systemPrompt ?? '').toContain('Propose xpAmount')
    expect(xp?.xpNarration).toBe('You learn from battle.')
    expect(xp?.xpAmount).toBe(clampXPProposal(80, budget).amount)
  })
})

describe('clampXPProposal integration', () => {
  it('clamps over-budget agent proposals', () => {
    const clamped = clampXPProposal(9999, { min: 10, max: 50, suggested: 30 })
    expect(clamped.amount).toBe(50)
    expect(clamped.clamped).toBe(true)
  })
})
