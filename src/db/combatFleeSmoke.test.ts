import { describe, expect, it } from 'vitest'
import { getActiveEncounter } from './repositories/combatEncounters'
import { seedCombatFleeSmokeCampaign } from './combatFleeSmokeFixtures'
import {
  fleeIntentJson,
  fleeSmokeProvider,
  npcReactionJson,
  resolveFleeTurn,
  scriptedRng
} from './combatFleeSmokeHelpers'
import { createScriptedProvider } from '../agents/providers/mockHarness'

describe('combat flee smoke failed attempt', () => {
  it('fails when the disengage check fails', async () => {
    const { db, campaign, player } = seedCombatFleeSmokeCampaign()
    const provider = fleeSmokeProvider()
    const rng = scriptedRng([0.05, 0.95, 0.95, 0.05, 0.95, 0.05])
    const failed = await resolveFleeTurn({
      db,
      campaignId: campaign.id,
      playerId: player.id,
      playerInput: 'I bolt for the door!',
      provider,
      rng
    })
    expect(failed.fleeOutcome?.phase).toBe('failed')
    expect(failed.fleeOutcome?.disengageCheck?.success).toBe(false)
    expect(getActiveEncounter(db, campaign.id)?.phase).toBe('active')
  })
})

describe('combat flee smoke pursued', () => {
  it('marks pursued after still_pursued judgment', async () => {
    const { db, campaign, player } = seedCombatFleeSmokeCampaign()
    const provider = fleeSmokeProvider()
    const rng = scriptedRng([0.05, 0.95, 0.95, 0.05, 0.95, 0.05])
    await resolveFleeTurn({
      db,
      campaignId: campaign.id,
      playerId: player.id,
      playerInput: 'I bolt for the door!',
      provider,
      rng
    })
    const pursued = await resolveFleeTurn({
      db,
      campaignId: campaign.id,
      playerId: player.id,
      playerInput: 'We need to get out of here!',
      provider,
      rng
    })
    expect(pursued.fleeOutcome?.phase).toBe('pursued')
    expect(pursued.fleeOutcome?.disengageCheck?.success).toBe(true)
    expect(getActiveEncounter(db, campaign.id)?.pursuitState).toBe('pursued')
  })
})

describe('combat flee smoke escape', () => {
  it('exits combat and allows exploration after escaped judgment', async () => {
    const { db, campaign, player } = seedCombatFleeSmokeCampaign()
    const provider = fleeSmokeProvider()
    const rng = scriptedRng([0.05, 0.95, 0.95, 0.05, 0.95, 0.05])
    await resolveFleeTurn({
      db,
      campaignId: campaign.id,
      playerId: player.id,
      playerInput: 'I bolt for the door!',
      provider,
      rng
    })
    await resolveFleeTurn({
      db,
      campaignId: campaign.id,
      playerId: player.id,
      playerInput: 'We need to get out of here!',
      provider,
      rng
    })
    const escaped = await resolveFleeTurn({
      db,
      campaignId: campaign.id,
      playerId: player.id,
      playerInput: 'I run for the exit!',
      provider,
      rng
    })
    expect(escaped.fleeOutcome?.phase).toBe('escaped')
    const afterEscape = getActiveEncounter(db, campaign.id)
    expect(afterEscape?.phase).toBe('active')
    expect(afterEscape?.exitedCombatantIds.some((ref) => ref.id === player.id)).toBe(true)

    const exploration = await resolveFleeTurn({
      db,
      campaignId: campaign.id,
      playerId: player.id,
      playerInput: 'I catch my breath in the hallway.',
      provider,
      rng
    })
    expect(exploration.fleeOutcome).toBeUndefined()
    expect(exploration.narrationText.length).toBeGreaterThan(0)
  })
})

describe('combat flee smoke engine authority', () => {
  it('rejects provider-forced escape when engine check fails', async () => {
    const { db, campaign, player } = seedCombatFleeSmokeCampaign()
    const result = await resolveFleeTurn({
      db,
      campaignId: campaign.id,
      playerId: player.id,
      playerInput: 'I try to flee',
      provider: createScriptedProvider([fleeIntentJson(), npcReactionJson()]),
      rng: scriptedRng([0.1, 0.9])
    })
    expect(result.fleeOutcome?.phase).toBe('failed')
    expect(result.fleeOutcome?.disengageCheck?.success).toBe(false)
  })
})
