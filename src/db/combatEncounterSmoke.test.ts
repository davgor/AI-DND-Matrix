import { describe, expect, it } from 'vitest'
import { getActiveEncounter } from './repositories/combatEncounters'
import { getNpcById } from './repositories/npcs'
import { listEventsByCampaign } from './repositories/events'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from '../main/turnIpc'
import {
  GOBLIN_LOOT_RESPONSE,
  attackRng,
  initiativeRng,
  seedCombatSmokeCampaign
} from './combatEncounterSmokeFixtures'

describe('combat encounter smoke', () => {
  it('resolves a full encounter with initiative, hit, miss, and end', async () => {
    const { db, campaign, player, goblin } = seedCombatSmokeCampaign()
    // The goblin's catch-up turn uses deterministic template flavor (040.6),
    // so no NPC reaction response is scripted between the two attack intents.
    const provider = createScriptedProvider([
      '{"checkNeeded":false,"combatIntent":"startEncounter"}',
      '{"checkNeeded":false,"combatIntent":"attack","targetNpcId":"' + goblin.id + '"}',
      '{"checkNeeded":false,"combatIntent":"attack","targetNpcId":"' + goblin.id + '"}',
      '{"outcome":"surrender","narrationText":"The goblin drops its weapon and raises its hands."}',
      '{"narrationText":"You gain insight from the fight.","xpAmount":40}',
      GOBLIN_LOOT_RESPONSE
    ])
    const turn = (input: string, rng: () => number = initiativeRng()) =>
      resolvePlayerTurn(db, provider, { campaignId: campaign.id, characterId: player.id, playerInput: input }, rng)

    expect((await turn('I draw my sword!')).combatState).not.toBeNull()
    expect((await turn('I swing and miss', attackRng(3))).combatAttack?.hit).toBe(false)
    const hit = await turn('I strike the goblin down', attackRng(20))
    expect(hit.combatAttack?.hit).toBe(true)
    expect(getNpcById(db, goblin.id)?.hp).toBeLessThan(10)
    const events = listEventsByCampaign(db, campaign.id)
    expect(events.some((event) => event.type === 'combat_started')).toBe(true)
    expect(events.some((event) => event.type === 'combat_attack')).toBe(true)
    // exactly the 3 intent calls — zero NPC/party catch-up flavor calls (040.6)
    expect(provider.calls).toHaveLength(3)
  })

  it('preserves encounter state across reload', async () => {
    const { db, campaign, player, goblin } = seedCombatSmokeCampaign()
    await resolvePlayerTurn(
      db,
      createScriptedProvider(['{"checkNeeded":false,"combatIntent":"startEncounter"}']),
      { campaignId: campaign.id, characterId: player.id, playerInput: 'Combat!' },
      initiativeRng()
    )
    const encounter = getActiveEncounter(db, campaign.id)
    expect(encounter?.initiativeOrder.length).toBeGreaterThan(0)
    expect(getNpcById(db, goblin.id)?.hp).toBe(10)
  })
})
