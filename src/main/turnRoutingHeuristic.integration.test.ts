import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createNpc } from '../db/repositories/npcs'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createRegion } from '../db/repositories/regions'
import { createQuest, getQuestById, upsertCharacterQuest } from '../db/repositories/quests'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { CAMPAIGN_ACTION_TRACE_PREFIX } from '../shared/debug/campaignActionTrace'
import { setCampaignActionTraceEnabledForTests } from './campaignActionTrace'
import { resolvePlayerTurn } from './turnIpc'

// 040.3 integration coverage: the starvation guard's failure mode is silent
// (a heuristic converse plan would simply never run dmNarration, so quest
// objectives would stop ticking with no error), hence these end-to-end checks.

function seedHeuristicScene() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Test', premisePrompt: '...', deathMode: 'legendary' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: '...' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'shopkeeper',
    disposition: 'friendly'
  })
  // Prior memory: not a first interaction, so only the quest guard can defer.
  appendNpcMemory(db, { npcId: npc.id, content: 'Kael greeted me yesterday.', tags: [] })
  return { db, campaign, region, player, npc }
}

function seedActiveQuest(
  scene: ReturnType<typeof seedHeuristicScene>,
  objectiveText: string
) {
  const quest = createQuest(scene.db, {
    campaignId: scene.campaign.id,
    kind: 'side',
    title: 'A Quiet Errand',
    summary: 'Something is amiss in town.',
    scale: 'minor',
    objectives: [{ id: 'obj-1', text: objectiveText, done: false }]
  })
  upsertCharacterQuest(scene.db, {
    characterId: scene.player.id,
    questId: quest.id,
    status: 'active',
    acceptedInGameDate: 0
  })
  return quest
}

beforeEach(() => {
  setCampaignActionTraceEnabledForTests(true)
})

afterEach(() => {
  setCampaignActionTraceEnabledForTests(undefined)
  vi.restoreAllMocks()
})

describe('quest-advancing dialogue falls through to LLM routing (starvation guard)', () => {
  it('still ticks the quest objective because dmNarration ran', async () => {
    const scene = seedHeuristicScene()
    const quest = seedActiveQuest(scene, 'Ask Mira about the stolen amulet')
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const provider = createScriptedProvider([
      JSON.stringify({
        intent: { checkNeeded: false },
        routingPlan: {
          disposition: 'composite',
          beats: [{ kind: 'dmNarration' }, { kind: 'npcResponse', npcIds: [scene.npc.id] }]
        }
      }),
      JSON.stringify({
        narrationText: "Mira's eyes narrow at the mention of the amulet.",
        questUpdates: [{ questId: quest.id, objectiveIndex: 0, objectiveDone: true }]
      }),
      '{"dialogue":"The amulet? Keep your voice down."}'
    ])

    const result = await resolvePlayerTurn(
      scene.db, 
      provider, 
      {
        campaignId: scene.campaign.id,
        characterId: scene.player.id,
        playerInput: 'Mira, what do you know about the amulet?'
      }, { rng: () => 0.5 })

    // The turn used merged LLM routing, not the heuristic converse row
    // (040.9: schemas live in systemPrompt, so distinguish the call there).
    expect(provider.calls[0]?.context?.systemPrompt ?? '').toContain('routingPlan')
    expect(debugSpy).toHaveBeenCalledWith(
      CAMPAIGN_ACTION_TRACE_PREFIX,
      'intent_route',
      expect.objectContaining({ source: 'llm' })
    )
    // dmNarration ran, so its quest side-effect write landed.
    expect(getQuestById(scene.db, quest.id)?.objectives[0]?.done).toBe(true)
    expect(result.npcReactions[0]?.text).toBe('The amulet? Keep your voice down.')
  })
})

describe('inert dialogue takes the heuristic fast path', () => {
  it('uses the intent-only prompt when active quests reference neither the NPC nor the region', async () => {
    const scene = seedHeuristicScene()
    seedActiveQuest(scene, 'Deliver the ledger to the harbormaster in Saltmarsh')
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const provider = createScriptedProvider([
      '{"checkNeeded":false}',
      '{"dialogue":"Well enough, thank you."}'
    ])

    const result = await resolvePlayerTurn(
      scene.db, 
      provider, 
      {
        campaignId: scene.campaign.id,
        characterId: scene.player.id,
        playerInput: 'Mira, how are you doing?'
      }, { rng: () => 0.5 })

    expect(provider.calls).toHaveLength(2)
    // Intent-only call: no routing schema in the systemPrompt, no scene
    // grounding payloads in the user prompt.
    expect(provider.calls[0]?.context?.systemPrompt ?? '').not.toContain('routingPlan')
    expect(provider.calls[0]?.prompt).not.toContain('Recent events')
    expect(debugSpy).toHaveBeenCalledWith(
      CAMPAIGN_ACTION_TRACE_PREFIX,
      'intent_route',
      expect.objectContaining({ source: 'heuristic' })
    )
    expect(result.narrationText).toBe('')
    expect(result.npcReactions[0]?.text).toBe('Well enough, thank you.')
  })
})
