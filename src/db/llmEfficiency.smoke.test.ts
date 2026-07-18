import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { generateFlaggedNpc } from '../agents/campaignGeneration/flaggedNpc'
import { RACE_LORE_RESPONSE } from '../test/fixtures/campaignGenerationFixtures'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from '../main/turnIpc'
import { attackRng, initiativeRng } from './combatEncounterSmokeFixtures'
import {
  buildFlaggedNpcInput,
  buildIdentityTranscript,
  captureIdentityPromptCall,
  captureNarrationPromptCall,
  IDENTITY_STATIC_BLOCK_MARKER,
  seedCombatScene,
  seedDialogueScene,
  seedFlaggedNpcCampaign,
  seedRealizedElfRace
} from './llmEfficiencySmokeFixtures'
import { getNpcById } from './repositories/npcs'
import { ELF_SCOUT_CORE, ELF_SCOUT_FINAL } from './npcCoreBundleFixtures'

// === 040.12: epic-wide LLM call-count ceilings + prompt-size regression. =====
// Each scenario drives the real turn pipeline (resolvePlayerTurn) or the real
// generation entry point with a scripted provider; a queued-response overrun
// (extra unexpected LLM call) fails with "no more scripted responses queued",
// and the explicit call-count asserts document the budget being guarded.

// --- prompt-size ceilings (040.4 slim context + 040.9/040.10 systemPrompt) ---
// Measured on the fixture campaign/interview at authoring time (see
// docs/runbooks/llm-efficiency-smoke-test.md). Ceilings are measured actual
// + ~30% headroom, so organic drift passes but a regression that reintroduces
// raw DB rows or per-turn static boilerplate fails here with a readable size.

// Measured 2026-07: 1,985 chars (slim events/log entries, no raw payloads).
const NARRATION_USER_PROMPT_CHAR_CEILING = 2_600
// Measured 2026-07: 5,454 chars (schema + guidance + emphasis, sent once per
// call as systemPrompt instead of repeated user-prompt boilerplate).
const NARRATION_SYSTEM_PROMPT_CHAR_CEILING = 7_100
// Measured 2026-07: 727 chars with a 5-entry window (windowed transcript +
// foundation status + latest message only — static identity block excluded;
// identical for the 10-turn fixture, which is the point).
const IDENTITY_USER_PROMPT_CHAR_CEILING = 950

const originalEnv = {
  enrich: process.env['ENRICH_REWARD_NARRATION'],
  flavor: process.env['COMBAT_LLM_FLAVOR']
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}

beforeEach(() => {
  // Both opt-in flags off: the budgets below are the defaults being guarded.
  delete process.env['ENRICH_REWARD_NARRATION']
  delete process.env['COMBAT_LLM_FLAVOR']
})

afterEach(() => {
  restoreEnv('ENRICH_REWARD_NARRATION', originalEnv.enrich)
  restoreEnv('COMBAT_LLM_FLAVOR', originalEnv.flavor)
})

// 040.2: intent + routing plan arrive from one merged LLM response.
function mergedTurn(intent: object, ...beats: object[]) {
  return JSON.stringify({ intent, routingPlan: { disposition: 'composite', beats } })
}

describe('efficiency smoke: simple dialogue turn (heuristic converse row, 040.3)', () => {
  it('spends exactly 1 intent-only call + 1 npcResponse call, zero routing', async () => {
    const { db, campaign, player } = seedDialogueScene()
    const provider = createScriptedProvider([
      '{"checkNeeded":false}',
      '{"dialogue":"Well met, Kael. The rope is fresh in."}'
    ])
    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'Tessa, how is the morning treating you?' },
      () => 0.5
    )
    expect(provider.calls, 'converse budget: intent + npcResponse, nothing else').toHaveLength(2)
    // The intent call must be the slim intent-only prompt: no routing schema
    // in systemPrompt, no scene grounding payloads in the user prompt.
    expect(provider.calls[0]?.context?.systemPrompt ?? '').not.toContain('routingPlan')
    expect(provider.calls[0]?.prompt).not.toContain('Recent events')
    expect(result.narrationText).toBe('')
    expect(result.npcReactions[0]?.text).toContain('rope is fresh')
  })
})

describe('efficiency smoke: check + narration turn (merged intent+route, 040.2)', () => {
  it('spends at most 2 calls: one merged intent+routing call, then narrate', async () => {
    const { db, campaign, player } = seedDialogueScene()
    const provider = createScriptedProvider([
      mergedTurn(
        { checkNeeded: true, ability: 'agility', dc: 12, proficient: false },
        { kind: 'dmNarration' }
      ),
      '{"narrationText":"The strongbox lock clicks open."}'
    ])
    const result = await resolvePlayerTurn(
      db,
      provider,
      { campaignId: campaign.id, characterId: player.id, playerInput: 'I try to pick the lock on the strongbox' },
      () => 0.5
    )
    expect(provider.calls, 'check-turn budget: merged intent+route + narrate').toHaveLength(2)
    // First call carried the routing half (not a separate routing round trip).
    expect(provider.calls[0]?.context?.systemPrompt ?? '').toContain('routingPlan')
    expect(result.check).toBeDefined()
    expect(result.narrationText).toContain('lock clicks open')
  })
})

describe('efficiency smoke: combat player attack with 2 NPC catch-up turns (040.6)', () => {
  it('spends 1 intent call for the attack turn and 0 catch-up flavor calls', async () => {
    const { db, campaign, player, goblins } = seedCombatScene({ goblinCount: 2, goblinHp: 10 })
    const provider = createScriptedProvider([
      '{"intent":{"checkNeeded":false,"combatIntent":"startEncounter"}}',
      `{"intent":{"checkNeeded":false,"combatIntent":"attack","targetNpcId":"${goblins[0]!.id}"}}`
    ])
    const turnInput = { campaignId: campaign.id, characterId: player.id }
    await resolvePlayerTurn(db, provider, { ...turnInput, playerInput: 'I draw my sword!' }, initiativeRng())
    expect(provider.calls, 'startEncounter budget: 1 intent call').toHaveLength(1)

    const result = await resolvePlayerTurn(
      db,
      provider,
      { ...turnInput, playerInput: 'I swing at the first goblin' },
      attackRng(3)
    )
    expect(provider.calls, 'attack budget: 1 intent call, 0 flavor for 2 NPC catch-up turns').toHaveLength(2)
    // Both goblins took their catch-up turns — on template flavor, not LLM.
    expect(result.npcReactions).toHaveLength(2)
    expect(result.combatAttack?.hit).toBe(false)
  })
})

describe('efficiency smoke: encounter end rewards with enrichment off (040.7 + 061)', () => {
  it('finalizes the encounter with one XP difficulty call and zero loot/yield LLM calls', async () => {
    const { db, campaign, player, goblins } = seedCombatScene({ goblinCount: 1, goblinHp: 1 })
    const provider = createScriptedProvider([
      '{"intent":{"checkNeeded":false,"combatIntent":"startEncounter"}}',
      `{"intent":{"checkNeeded":false,"combatIntent":"attack","targetNpcId":"${goblins[0]!.id}"}}`,
      '{"difficulty":"easy"}'
    ])
    const turnInput = { campaignId: campaign.id, characterId: player.id }
    await resolvePlayerTurn(db, provider, { ...turnInput, playerInput: 'To arms!' }, initiativeRng())
    const result = await resolvePlayerTurn(
      db,
      provider,
      { ...turnInput, playerInput: 'I strike the goblin down' },
      attackRng(20)
    )
    // 3 calls total = two intents + one 64-token XP difficulty rating (061).
    // Yield (040.8) and loot (040.7) resolve rules-first/template with zero calls.
    expect(provider.calls, 'reward budget: 1 XP difficulty call, 0 loot/yield LLM calls').toHaveLength(3)
    expect(result.combatState).toBeNull()
    expect(getNpcById(db, goblins[0]!.id)?.encounterOutcome).toBe('slain')
    expect(result.xpAmount).toBeGreaterThan(0)
    expect(result.xpNarration).toBeTruthy()
  })
})

describe('efficiency smoke: flagged NPC generation ceilings (040.13)', () => {
  it('spends exactly 2 provider calls when the chosen race is already realized', async () => {
    const { db, campaign, region } = seedFlaggedNpcCampaign()
    seedRealizedElfRace(db, campaign.id)
    const provider = createScriptedProvider([ELF_SCOUT_CORE, ELF_SCOUT_FINAL])
    const result = await generateFlaggedNpc(db, provider, buildFlaggedNpcInput(campaign.id, region))
    expect(provider.calls, 'flagged NPC budget (race realized): core bundle + details').toHaveLength(2)
    expect(result.npc.name).toBe('Sylwen')
  })

  it('spends exactly 3 provider calls when the chosen race is not yet realized', async () => {
    const { db, campaign, region } = seedFlaggedNpcCampaign()
    const provider = createScriptedProvider([ELF_SCOUT_CORE, RACE_LORE_RESPONSE, ELF_SCOUT_FINAL])
    const result = await generateFlaggedNpc(db, provider, buildFlaggedNpcInput(campaign.id, region))
    expect(provider.calls, 'flagged NPC budget (new race): core bundle + race lore + details').toHaveLength(3)
    expect(result.npc.raceKey).toBe('elf')
  })
})

describe('prompt size regression: slim narration context (040.4 + 040.9)', () => {
  it('keeps the fixture-campaign narration prompts under their documented ceilings', async () => {
    const call = await captureNarrationPromptCall()
    expect(
      call.prompt.length,
      `narration user prompt grew past ${NARRATION_USER_PROMPT_CHAR_CEILING} chars — slim-context regression?`
    ).toBeLessThanOrEqual(NARRATION_USER_PROMPT_CHAR_CEILING)
    expect(
      call.context?.systemPrompt?.length ?? 0,
      `narration systemPrompt grew past ${NARRATION_SYSTEM_PROMPT_CHAR_CEILING} chars`
    ).toBeLessThanOrEqual(NARRATION_SYSTEM_PROMPT_CHAR_CEILING)
    // Slim shapes hold: no raw DB rows (internal ids/dates) in the user prompt.
    expect(call.prompt).not.toContain('"campaignId"')
    expect(call.prompt).not.toContain('"createdAt"')
    expect(call.prompt).not.toContain('"timestamp"')
  })
})

describe('prompt size regression: guided identity windowing (040.10)', () => {
  it('stays flat: a 10-turn transcript prompts identically to its last-5 window', async () => {
    const windowedFive = buildIdentityTranscript(5)
    const tenWithAgedOutEarlyTurns = [...buildIdentityTranscript(5, 'aged-out'), ...windowedFive]
    const tenCall = await captureIdentityPromptCall(tenWithAgedOutEarlyTurns)
    const fiveCall = await captureIdentityPromptCall(windowedFive)
    // The last 5 entries are identical by construction, so windowing makes the
    // prompts exactly equal — any size delta means turns 1-5 leaked back in.
    expect(tenCall.prompt).toBe(fiveCall.prompt)
    expect(
      tenCall.prompt.length,
      `identity user prompt grew past ${IDENTITY_USER_PROMPT_CHAR_CEILING} chars — windowing regression?`
    ).toBeLessThanOrEqual(IDENTITY_USER_PROMPT_CHAR_CEILING)
  })

  it('keeps the static identity block in systemPrompt, not the per-turn user prompt', async () => {
    const call = await captureIdentityPromptCall(buildIdentityTranscript(5))
    expect(call.context?.systemPrompt ?? '').toContain(IDENTITY_STATIC_BLOCK_MARKER)
    expect(call.prompt).not.toContain(IDENTITY_STATIC_BLOCK_MARKER)
  })
})
