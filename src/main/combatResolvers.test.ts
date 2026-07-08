import { afterEach, describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createNpc, setNpcCombatStats } from '../db/repositories/npcs'
import { createActiveEncounter } from '../db/repositories/combatEncounters'
import { listEventsByCampaign } from '../db/repositories/events'
import { listNpcMemoriesByNpc } from '../db/repositories/npcMemories'
import { createScriptedProvider, type ScriptedResponse } from '../agents/providers/mockHarness'
import type { Temperament } from '../shared/alignment/types'
import type { CombatantRef } from '../shared/combat/types'
import { buildNpcCombatFlavor, buildPartyMemberCombatFlavor } from './combatFlavorTemplates'
import { resolveNonPlayerCatchUp } from './combatResolvers'
import { resolvePlayerTurn } from './turnIpc'

const ORIGINAL_FLAG = process.env['COMBAT_LLM_FLAVOR']

afterEach(() => {
  if (ORIGINAL_FLAG === undefined) {
    delete process.env['COMBAT_LLM_FLAVOR']
  } else {
    process.env['COMBAT_LLM_FLAVOR'] = ORIGINAL_FLAG
  }
})

function fixedRng(value: number) {
  return () => value
}

interface SeedOptions {
  canSpeak?: boolean
  temperament?: Temperament
  withPartyMember?: boolean
}

function seedCombatWorld(options: SeedOptions = {}) {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Road', description: '...' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    hp: 20,
    level: 1,
    stats: { abilityScores: { body: 12, agility: 14, mind: 10, presence: 10 }, maxHp: 20 }
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Goblin',
    role: 'scout',
    disposition: 'hostile',
    temperament: options.temperament ?? 'aggressive',
    canSpeak: options.canSpeak ?? true,
    skipCombatHydration: true
  })
  setNpcCombatStats(db, npc.id, { hp: 10, maxHp: 10, ac: 12 })
  const partyMember = options.withPartyMember
    ? createCharacter(db, {
        campaignId: campaign.id,
        name: 'Brom',
        characterClass: 'ranger',
        kind: 'ai_party_member',
        hp: 15,
        stats: { abilityScores: { body: 10, agility: 12, mind: 10, presence: 10 } }
      })
    : undefined
  return { db, campaign, region, player, npc, partyMember }
}

interface RunOptions extends SeedOptions {
  rngValue: number
  responses?: ScriptedResponse[]
}

/** Seeds a world, starts a non-player-first encounter, and runs catch-up. */
async function runCatchUp(options: RunOptions) {
  const world = seedCombatWorld(options)
  const refs: CombatantRef[] = [
    ...(world.partyMember ? [{ kind: 'ai_party_member' as const, id: world.partyMember.id }] : []),
    { kind: 'npc' as const, id: world.npc.id },
    { kind: 'player' as const, id: world.player.id }
  ]
  const encounter = createActiveEncounter(world.db, {
    campaignId: world.campaign.id,
    initiativeOrder: refs.map((ref, index) => ({ combatant: ref, roll: 20 - index })),
    participantIds: refs
  })
  const provider = createScriptedProvider(options.responses ?? [])
  const result = await resolveNonPlayerCatchUp({
    db: world.db,
    provider,
    campaignId: world.campaign.id,
    player: world.player,
    encounter,
    rng: fixedRng(options.rngValue)
  })
  return { ...world, provider, result }
}

function expectedNpcFlavor(input: { temperament?: Temperament; canSpeak?: boolean; hit: boolean }) {
  return buildNpcCombatFlavor({
    npcName: 'Goblin',
    temperament: input.temperament ?? 'aggressive',
    disposition: 'hostile',
    canSpeak: input.canSpeak ?? true,
    hit: input.hit
  })
}

describe('resolveNonPlayerCatchUp: speaking NPC template flavor (040.6)', () => {
  it('resolves the NPC turn with zero provider calls and the hit dialogue template', async () => {
    const { provider, result, npc } = await runCatchUp({ rngValue: 0.99 })

    expect(provider.calls).toHaveLength(0)
    expect(result.npcReactions).toHaveLength(1)
    expect(result.npcReactions[0]).toMatchObject({
      npcId: npc.id,
      npcName: 'Goblin',
      reactionKind: 'dialogue',
      text: expectedNpcFlavor({ hit: true }).text
    })
  })

  it('uses the miss template and applies no damage when the engine attack misses', async () => {
    const { db, player, result } = await runCatchUp({ rngValue: 0 })

    expect(result.npcReactions[0]?.attackResult?.hit).toBe(false)
    expect(result.npcReactions[0]?.text).toBe(expectedNpcFlavor({ hit: false }).text)
    expect(getCharacterById(db, player.id)!.hp).toBe(20)
  })
})

describe('resolveNonPlayerCatchUp: engine attack semantics unchanged', () => {
  it('applies hit damage and records the combat_attack event', async () => {
    const { db, campaign, player, npc, result } = await runCatchUp({ rngValue: 0.99 })

    expect(result.npcReactions[0]?.attackResult?.hit).toBe(true)
    expect(result.lastAttackerNpcId).toBe(npc.id)
    expect(getCharacterById(db, player.id)!.hp).toBeLessThan(20)
    const attacks = listEventsByCampaign(db, campaign.id, { type: 'combat_attack' })
    expect(attacks).toHaveLength(1)
    expect(attacks[0]?.payload['attacker']).toEqual({ kind: 'npc', id: npc.id })
  })
})

describe('resolveNonPlayerCatchUp: non-speaking NPC template flavor', () => {
  it('renders a **wrapped** action line with reactionKind action', async () => {
    const { result } = await runCatchUp({ rngValue: 0.99, canSpeak: false, temperament: 'territorial' })

    expect(result.npcReactions[0]?.reactionKind).toBe('action')
    expect(result.npcReactions[0]?.text.startsWith('**')).toBe(true)
    expect(result.npcReactions[0]?.text.endsWith('**')).toBe(true)
    expect(result.npcReactions[0]?.text).toContain('Goblin')
  })
})

describe('resolveNonPlayerCatchUp: party member template flavor', () => {
  it('resolves party member turns with zero provider calls and a template action event', async () => {
    const { db, campaign, provider, result } = await runCatchUp({ rngValue: 0.99, withPartyMember: true })

    expect(provider.calls).toHaveLength(0)
    expect(result.partyMemberActions).toHaveLength(1)
    expect(result.partyMemberActions[0]?.actionText).toBe(buildPartyMemberCombatFlavor('Brom'))
    const events = listEventsByCampaign(db, campaign.id, { type: 'party_member_action' })
    expect(events).toHaveLength(1)
    expect(events[0]?.payload['combatTurn']).toBe(true)
    expect(events[0]?.payload['content']).toBe(buildPartyMemberCombatFlavor('Brom'))
  })
})

describe('resolveNonPlayerCatchUp: COMBAT_LLM_FLAVOR=true opt-in', () => {
  it('restores the LLM flavor path for NPC and party member turns', async () => {
    process.env['COMBAT_LLM_FLAVOR'] = 'true'
    const { provider, result } = await runCatchUp({
      rngValue: 0.99,
      withPartyMember: true,
      responses: ['{"actionText":"Brom looses an arrow."}', '{"dialogue":"You dare!"}']
    })

    expect(provider.calls).toHaveLength(2)
    expect(result.partyMemberActions[0]?.actionText).toBe('Brom looses an arrow.')
    expect(result.npcReactions[0]?.text).toBe('You dare!')
    expect(result.npcReactions[0]?.attackResult?.hit).toBe(true)
  })
})

describe('non-combat NPC reaction path is untouched (data-integrity item 9)', () => {
  it('still uses the LLM, persists an NPC memory, and resolves attack:true via the engine', async () => {
    const { db, campaign, player, npc } = seedCombatWorld()
    const provider = createScriptedProvider([
      JSON.stringify({
        intent: { checkNeeded: false },
        routingPlan: { disposition: 'converse', beats: [{ kind: 'npcResponse', npcIds: [npc.id] }] }
      }),
      '{"dialogue":"Die!","attack":true}'
    ])

    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I taunt the goblin' },
      fixedRng(0.99)
    )

    // merged intent+routing call (040.2) plus the NPC reaction call
    expect(provider.calls).toHaveLength(2)
    expect(result.npcReactions[0]?.text).toBe('Die!')
    expect(result.npcReactions[0]?.attackResult?.hit).toBe(true)
    const memories = listNpcMemoriesByNpc(db, npc.id)
    expect(memories.map((memory) => memory.content)).toContain('Die!')
  })
})
