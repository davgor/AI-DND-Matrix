import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createNpc, setNpcEncounterOutcome } from '../db/repositories/npcs'
import { listEventsByCampaign } from '../db/repositories/events'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { enrichTurnWithEncounterRewards, submitPerkChoice, getPendingLevelUpCeremony } from './progressionPipeline'
import type { CombatEncounter } from '../shared/combat/types'

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

describe('progression pipeline enrichment', () => {
  it('runs loot after XP in encounter enrichment with zero LLM calls by default', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 't', deathMode: 'standard' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'd' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      level: 3
    })
    const bandit = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Bandit',
      role: 'thug',
      disposition: 'hostile'
    })
    setNpcEncounterOutcome(db, bandit.id, 'slain')
    const provider = createScriptedProvider([])
    const turn = await enrichTurnWithEncounterRewards({
      db,
      provider,
      encounter: makeEncounter(campaign.id, bandit.id, player.id),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id,
      base: { narrationText: 'Fight over.', npcReactions: [], partyMemberActions: [], pendingAlignmentShift: null }
    })
    expect(provider.calls).toHaveLength(0)
    expect(turn.xpAmount).toBeGreaterThan(0)
    expect(turn.xpNarration?.length).toBeGreaterThan(0)
    expect(turn.lootGrants?.length).toBeGreaterThan(0)
    expect(turn.lootNarration).toContain(turn.lootGrants![0]!.itemName)
    const events = listEventsByCampaign(db, campaign.id)
    const xpIndex = events.findIndex((e) => e.type === 'xp_awarded')
    const lootIndex = events.findIndex((e) => e.type === 'loot_resolved')
    expect(lootIndex).toBeGreaterThan(xpIndex)
  })
})

describe('submitPerkChoice', () => {
  it('persists perk choice and clears first queued ceremony', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 't', deathMode: 'standard' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      level: 2,
      xp: 300,
      stats: {
        pendingLevelUpQueue: [
          {
            targetLevel: 2,
            spanStartXp: 0,
            narrationText: 'Pick one.',
            perks: [
              { id: 'pick-a', name: 'A', description: 'a', category: 'ac_bonus', flavorTags: [] },
              { id: 'pick-b', name: 'B', description: 'b', category: 'hp_max_bonus', flavorTags: [] },
              { id: 'pick-c', name: 'C', description: 'c', category: 'extra_attack', flavorTags: [] }
            ]
          }
        ]
      }
    })
    const result = submitPerkChoice(db, player.id, 'pick-a')
    expect(result.applied).toBe(true)
    expect((getCharacterById(db, player.id)!.stats as { perks?: unknown[] }).perks).toHaveLength(1)
    expect(getPendingLevelUpCeremony(db, player.id)).toBeNull()
    expect(listEventsByCampaign(db, campaign.id).some((e) => e.type === 'perk_chosen')).toBe(true)
  })
})
