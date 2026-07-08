import { describe, expect, it } from 'vitest'
import { getCreatureByKey } from './catalog/creatures'
import { hydrateNpcFromCatalog } from './repositories/npcCombatHydration'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from '../main/turnIpc'
import { initiativeRng, seedCombatSmokeCampaign } from './combatEncounterSmokeFixtures'

describe('combat HUD HP smoke', () => {
  it('shows sane x/y HP for player and catalog monster after encounter start', async () => {
    const { db, campaign, player, goblin } = seedCombatSmokeCampaign()
    hydrateNpcFromCatalog(db, goblin.id, getCreatureByKey(db, 'goblin-scout')!)

    const turn = await resolvePlayerTurn(
      db,
      createScriptedProvider(['{"intent":{"checkNeeded":false,"combatIntent":"startEncounter"}}']),
      { campaignId: campaign.id, characterId: player.id, playerInput: 'Fight!' },
      initiativeRng()
    )

    const hero = turn.combatState?.combatants.find((c) => c.ref.kind === 'player')
    const monster = turn.combatState?.combatants.find((c) => c.ref.kind === 'npc')
    expect(hero?.maxHp).toBeGreaterThan(0)
    expect(monster?.maxHp).toBeGreaterThan(1)
  })
})
