import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createNpc, setNpcEncounterOutcome } from '../db/repositories/npcs'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { listEventsByCampaign } from '../db/repositories/events'
import {
  assertNoPendingLevelUp,
  getPendingLevelUpCeremony,
  LevelUpPendingError,
  runEncounterXpPass
} from './progressionPipeline'
import type { CombatEncounter } from '../shared/combat/types'

const XP_RESPONSE = JSON.stringify({ difficulty: 'medium' })
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
    // Level 1 span 300, medium rating = 10% = 30 XP; 270 + 30 = 300 crosses to level 2
    expect(xp?.xpAmount).toBe(30)
    const updated = getCharacterById(db, player.id)!
    expect(updated.level).toBe(2)
    const pending = getPendingLevelUpCeremony(db, player.id)
    expect(pending?.perks).toHaveLength(3)
    expect(() => assertNoPendingLevelUp(db, player.id)).toThrow(LevelUpPendingError)

    const xpEvent = listEventsByCampaign(db, campaign.id).find((e) => e.type === 'xp_awarded')
    expect(xpEvent?.payload).toMatchObject({ amount: 30, difficulty: 'medium' })
  })
})
