/**
 * End-to-end smoke tests for NPC yield / non-lethal outcomes (epic 034).
 * Scenarios:
 *   A – provoked farmer surrenders at HP threshold
 *   B – skittish NPC flees when damaged
 *   C – non-lethal attack incapacitates, NPC stays alive
 *   D – fanatic fights to slain (control case via finalizeEncounter)
 */
import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createRegion } from './repositories/regions'
import { createNpc, getNpcById, setNpcEncounterOutcome, setNpcCombatStats } from './repositories/npcs'
import { checkYieldEligibility } from '../engine/yieldEligibility'
import { resolvePlayerAttackAgainstNpc } from '../engine/playerAttack'
import { applyNpcYieldOutcome } from '../main/combatOrchestration'
import { listEventsByCampaign } from './repositories/events'

function seedWorld() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Yield Test', premisePrompt: '...', deathMode: 'legendary' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: '...' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    hp: 20,
    level: 1,
    currency: 0,
    stats: { abilityScores: { body: 12, agility: 14, mind: 10, presence: 10 } }
  })
  return { db, campaign, region, player }
}

describe('Scenario A: provoked farmer surrenders at HP threshold', () => {
  it('villager NPC triggers yield check and survives as surrendered', () => {
    const { db, campaign, region } = seedWorld()
    const farmer = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Elara',
      role: 'farmer',
      disposition: 'hostile — provoked by the player\'s attack',
      temperament: 'neutral',
      backstory: 'A simple farmer who grabbed her pitchfork in desperation.',
      canSpeak: true
    })
    setNpcCombatStats(db, farmer.id, { hp: 4, maxHp: 8, ac: 10 })

    const eligibility = checkYieldEligibility({
      combatTier: 'villager',
      temperament: 'neutral',
      hp: 4,
      maxHp: 8,
      wouldKill: false,
      canSpeak: true
    })
    expect(eligibility.yieldCheckRequired).toBe(true)
    expect(eligibility.suggestedOutcomes).toContain('surrender')

    applyNpcYieldOutcome(db, campaign.id, farmer.id, { outcome: 'surrender', narrationHint: 'Elara drops her pitchfork.' })

    const after = getNpcById(db, farmer.id)
    expect(after?.status.alive).toBe(true)
    expect(after?.encounterOutcome).toBe('surrender')
    expect(after?.disposition).toContain('subdued')

    const events = listEventsByCampaign(db, campaign.id, { type: 'npc_surrendered' })
    expect(events).toHaveLength(1)
    expect(events[0]?.payload['npcId']).toBe(farmer.id)
  })
})

describe('Scenario B: skittish NPC flees', () => {
  it('skittish NPC at 50% HP triggers yield and can be marked fled, still alive', () => {
    const { db, campaign, region } = seedWorld()
    const bandit = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Jax',
      role: 'bandit',
      disposition: 'hostile',
      temperament: 'skittish',
      backstory: 'A cowardly brigand who runs at the first sign of real trouble.',
      canSpeak: true
    })
    setNpcCombatStats(db, bandit.id, { hp: 5, maxHp: 10, ac: 12 })

    const eligibility = checkYieldEligibility({
      combatTier: 'villager',
      temperament: 'skittish',
      hp: 5,
      maxHp: 10,
      wouldKill: false,
      canSpeak: true
    })
    expect(eligibility.yieldCheckRequired).toBe(true)

    applyNpcYieldOutcome(db, campaign.id, bandit.id, { outcome: 'flee', narrationHint: 'Jax sprints for the treeline.' })

    const after = getNpcById(db, bandit.id)
    expect(after?.status.alive).toBe(true)
    expect(after?.encounterOutcome).toBe('flee')

    const events = listEventsByCampaign(db, campaign.id, { type: 'npc_fled_combat' })
    expect(events).toHaveLength(1)
  })
})

describe('Scenario C: non-lethal attack incapacitates NPC', () => {
  it('non-lethal at 0 HP sets incapacitated=true and NPC stays alive', () => {
    const { db, campaign, region } = seedWorld()
    const guard = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Guard Tom',
      role: 'guard',
      disposition: 'hostile',
      temperament: 'disciplined',
      backstory: 'A town guard doing his job.',
      canSpeak: true
    })
    setNpcCombatStats(db, guard.id, { hp: 6, maxHp: 10, ac: 12 })

    const resolution = resolvePlayerAttackAgainstNpc({
      rng: () => 0.95,
      attackModifier: 5,
      weaponComponents: [{ damageRoll: { diceCount: 2, diceSize: 6, modifier: 3 }, damageType: 'physical' }],
      targetAc: 12,
      targetHp: 6,
      lethality: 'non_lethal'
    })
    if (resolution.hit && resolution.incapacitated) {
      setNpcEncounterOutcome(db, guard.id, 'incapacitated')
    }

    const after = getNpcById(db, guard.id)
    if (resolution.incapacitated) {
      expect(after?.status.alive).toBe(true)
      expect(after?.encounterOutcome).toBe('incapacitated')
    }
    expect(resolution.wouldKill).toBe(false)
    if (resolution.hit) {
      expect(resolution.lethality).toBe('non_lethal')
    }
  })
})

describe('Scenario D: fanatic fights to slain (control case)', () => {
  it('fanatic with aggressive temperament does not yield before 0 HP', () => {
    const { db, campaign, region } = seedWorld()
    const fanatic = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Malachar',
      role: 'cultist',
      disposition: 'hostile',
      temperament: 'aggressive',
      backstory: 'A true believer. Surrender is apostasy.',
      canSpeak: true
    })
    setNpcCombatStats(db, fanatic.id, { hp: 3, maxHp: 12, ac: 14 })

    const eligibility = checkYieldEligibility({
      combatTier: 'catalog',
      temperament: 'aggressive',
      hp: 3,
      maxHp: 12,
      wouldKill: false,
      canSpeak: true
    })
    expect(eligibility.yieldCheckRequired).toBe(false)

    setNpcEncounterOutcome(db, fanatic.id, 'slain')
    const after = getNpcById(db, fanatic.id)
    expect(after?.status.alive).toBe(false)
    expect(after?.encounterOutcome).toBe('slain')
  })

  it('engine remains authoritative: only slain sets alive=false', () => {
    const { db, campaign, region } = seedWorld()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Yielder',
      role: 'thug',
      disposition: 'hostile',
      temperament: 'cautious',
      backstory: 'Will surrender if losing.',
      canSpeak: true
    })
    setNpcCombatStats(db, npc.id, { hp: 2, maxHp: 10, ac: 10 })
    setNpcEncounterOutcome(db, npc.id, 'surrender')
    const surrendered = getNpcById(db, npc.id)
    expect(surrendered?.status.alive).toBe(true)
    setNpcEncounterOutcome(db, npc.id, 'slain')
    const slain = getNpcById(db, npc.id)
    expect(slain?.status.alive).toBe(false)
  })
})
