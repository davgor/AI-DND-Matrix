import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { listEventsByCampaign } from '../db/repositories/events'
import { listLogEntriesByCharacter } from '../db/repositories/logEntries'
import { createNpc } from '../db/repositories/npcs'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { resolvePlayerTurn } from './turnIpc'

// 040.5 compounding-starvation check (data-integrity item 6):
// `inactive_player_action` events are the inactive character's only per-turn
// record and the only grounding for their future proxy calls — there is no
// backfill. Signal-free converse-only turns skip the proxy (npcResponse never
// touches sceneContext), but a name mention / plan reference / cross-character
// log write must still wake it even when sceneContext is empty. 040.3's
// converse fast path layers on top, so the signal gate must not leave inactive
// characters silent for a whole session: they must act within a bounded number
// of mixed turns whenever a cross-character signal occurs.

function mergedTurn(intent: object, ...beats: object[]) {
  return JSON.stringify({ intent, routingPlan: { disposition: 'composite', beats } })
}

function seedSharedRegionScene() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Shared', premisePrompt: '...', deathMode: 'legendary' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Crossroads', description: '...' })
  const active = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    stats: { currentRegionId: region.id }
  })
  const inactive = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Lyra',
    characterClass: 'mage',
    kind: 'player',
    stats: { currentRegionId: region.id, personality: 'curious' }
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'shopkeeper',
    disposition: 'friendly'
  })
  appendNpcMemory(db, { npcId: npc.id, content: 'Kael greeted me yesterday.', tags: [] })
  return { db, campaign, region, active, inactive, npc }
}

type Scene = ReturnType<typeof seedSharedRegionScene>

function playTurn(scene: Scene, playerInput: string, responses: string[]) {
  return resolvePlayerTurn(
    scene.db, 
    createScriptedProvider(responses), 
    { campaignId: scene.campaign.id, characterId: scene.active.id, playerInput }, { rng: () => 0.5 })
}

function inactiveActionEvents(scene: Scene) {
  return listEventsByCampaign(scene.db, scene.campaign.id, { type: 'inactive_player_action' })
}

async function playSignalFreeTurns(scene: Scene): Promise<void> {
  // Turn 1: converse-only — npcResponse never touches scene context, so the
  // proxy is skipped exactly as it was before 040.5.
  await playTurn(scene, 'Mira, how is business?', [
    mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [scene.npc.id] }),
    '{"dialogue":"Slow, but steady."}'
  ])
  // Turn 2: narrated, but nothing references Lyra — the 040.5 gate skips.
  await playTurn(scene, 'I check the notice board', [
    mergedTurn({ checkNeeded: false }, { kind: 'dmNarration' }),
    '{"narrationText":"Faded notices flap in the wind."}'
  ])
}

describe('inactive characters act within a bounded number of mixed turns (040.5)', () => {
  it('stays silent on signal-free turns, then acts on a name-mention turn', async () => {
    const scene = seedSharedRegionScene()
    await playSignalFreeTurns(scene)
    expect(inactiveActionEvents(scene)).toHaveLength(0)

    // Turn 3: the player names Lyra — the proxy must fire this turn.
    const result = await playTurn(scene, 'I wave Lyra over to the notice board', [
      mergedTurn({ checkNeeded: false }, { kind: 'dmNarration' }),
      '{"narrationText":"Your companion crosses the square toward you."}',
      '{"actionText":"Lyra joins Kael, scanning the notices."}'
    ])

    expect(result.inactivePlayerActions?.[0]?.actionText).toBe(
      'Lyra joins Kael, scanning the notices.'
    )
    const events = inactiveActionEvents(scene)
    expect(events).toHaveLength(1)
    expect(events[0]?.payload['characterId']).toBe(scene.inactive.id)
  })
})

describe('cross-character log writes wake the proxy without a name mention (040.5)', () => {
  it('fires the proxy and persists both continuity channels on the signal turn', async () => {
    const scene = seedSharedRegionScene()
    await playSignalFreeTurns(scene)
    expect(inactiveActionEvents(scene)).toHaveLength(0)

    // Turn 3: narration decides the two protagonists cross paths.
    const result = await playTurn(scene, 'I head to the well for water', [
      mergedTurn({ checkNeeded: false }, { kind: 'dmNarration' }),
      JSON.stringify({
        narrationText: 'A familiar mage is already drawing water at the well.',
        crossCharacterLogBookEntries: [
          {
            characterId: scene.inactive.id,
            category: 'event',
            title: 'Met Kael at the well',
            content: 'Kael came for water while I rested.'
          }
        ]
      }),
      '{"actionText":"Lyra hands Kael the ladle."}'
    ])

    expect(result.inactivePlayerActions?.[0]?.actionText).toBe('Lyra hands Kael the ladle.')
    // Both continuity channels landed: the per-turn event and the log entry.
    expect(inactiveActionEvents(scene)).toHaveLength(1)
    const logEntries = listLogEntriesByCharacter(scene.db, scene.inactive.id)
    expect(logEntries.map((entry) => entry.title)).toContain('Met Kael at the well')
  })
})
