import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createNpc, setNpcEncounterOutcome } from '../db/repositories/npcs'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { clampXPProposal } from '../engine/xpBudget'
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

describe('progression pipeline', () => {
  it('awards encounter XP and queues level-up ceremony', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 't', deathMode: 'standard' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'd' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      level: 1,
      xp: 270
    })
    const bandit = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Bandit',
      role: 'thug',
      disposition: 'hostile'
    })
    setNpcEncounterOutcome(db, bandit.id, 'slain')

    const provider = createScriptedProvider([XP_RESPONSE, LEVEL_UP_RESPONSE, LEVEL_UP_RESPONSE])
    const xp = await runEncounterXpPass({
      db,
      provider,
      encounter: makeEncounter(campaign.id, bandit.id, player.id),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(xp?.xpAmount).toBeGreaterThan(0)
    const updated = getCharacterById(db, player.id)!
    expect(updated.level).toBe(2)
    const pending = getPendingLevelUpCeremony(db, player.id)
    expect(pending?.perks).toHaveLength(3)
    expect(() => assertNoPendingLevelUp(db, player.id)).toThrow(LevelUpPendingError)
  })
})

describe('clampXPProposal integration', () => {
  it('clamps over-budget agent proposals', () => {
    const clamped = clampXPProposal(9999, { min: 10, max: 50, suggested: 30 })
    expect(clamped.amount).toBe(50)
    expect(clamped.clamped).toBe(true)
  })
})
