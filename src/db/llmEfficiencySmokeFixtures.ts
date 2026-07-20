import type Database from 'better-sqlite3'
import { assembleNarrationContext, narrate } from '../agents/dm'
import {
  defaultIdentityFoundations,
  runIdentityInterviewTurn,
  type IdentityInterviewContext
} from '../agents/guidedIdentity'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import type { MockProviderCall } from '../agents/providers/types'
import { createCampaign } from './repositories/campaigns'
import { createCampaignRace } from './repositories/campaignRaces'
import { createCharacter } from './repositories/characters'
import { appendEvent } from './repositories/events'
import { createLogEntry } from './repositories/logEntries'
import { appendNpcMemory } from './repositories/npcMemories'
import { createNpc, setNpcCombatStats, type Npc } from './repositories/npcs'
import { createQuest, upsertCharacterQuest } from './repositories/quests'
import { createRegion } from './repositories/regions'
import { createWorldFact } from './repositories/worldFacts'
import { createTestDb } from './testUtils'

// === 040.12 fixtures: scenario worlds + prompt-capture helpers for the ======
// === LLM efficiency smoke suite (llmEfficiency.smoke.test.ts). ==============

export function seedDialogueScene() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Efficiency Smoke',
    premisePrompt: 'A riverside market town',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Market Square',
    description: 'Stalls and rope merchants around a cracked bell tower'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    stats: {
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
      currentRegionId: region.id
    }
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Tessa',
    role: 'shopkeeper',
    disposition: 'friendly',
    canSpeak: true
  })
  // Previously met: without a prior memory the heuristic's first-interaction
  // starvation guard defers converse turns to LLM routing (040.3).
  appendNpcMemory(db, { npcId: npc.id, content: 'Kael greeted me yesterday.', tags: [] })
  return { db, campaign, region, player, npc }
}

type DialogueScene = ReturnType<typeof seedDialogueScene>

export function seedCombatScene(options: { goblinCount: number; goblinHp: number }) {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Efficiency Combat',
    premisePrompt: 'A goblin ambush',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Road',
    description: 'A dusty road'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    hp: 20,
    level: 1,
    stats: {
      abilityScores: { body: 14, agility: 16, mind: 10, presence: 10 },
      currentRegionId: region.id,
      weaponProficient: true
    }
  })
  const goblins: Npc[] = []
  for (let index = 1; index <= options.goblinCount; index += 1) {
    const goblin = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: `Goblin ${index}`,
      role: 'scout',
      disposition: 'hostile',
      temperament: 'aggressive',
      skipCombatHydration: true
    })
    setNpcCombatStats(db, goblin.id, { hp: options.goblinHp, maxHp: options.goblinHp, ac: 12 })
    goblins.push(goblin)
  }
  return { db, campaign, region, player, goblins }
}

// --- flagged-NPC scenarios (040.13 ceilings, re-asserted here) ---------------

const FLAGGED_NPC_RACE_LORE = {
  summary: 'Elves are long-lived wardens of the deep woods.',
  appearance: 'Slight, sharp-eared, and quick.',
  culture: 'Bound to grove oaths and old songs.',
  roleInThisLand: 'They watch the frontier treelines.',
  hooks: ['An elven warden seeks a lost heirloom.']
}

export function seedFlaggedNpcCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Flagged NPC Budget',
    premisePrompt: 'A frontier town.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A logging village.'
  })
  return { db, campaign, region }
}

export function seedRealizedElfRace(db: Database.Database, campaignId: string): void {
  createCampaignRace(db, {
    campaignId,
    raceKey: 'elf',
    kind: 'preset',
    label: 'Elf',
    seedPrompt: 'Forest folk.',
    lore: FLAGGED_NPC_RACE_LORE,
    createdByCharacterId: null
  })
}

export function buildFlaggedNpcInput(
  campaignId: string,
  region: { id: string; name: string; description: string }
) {
  return {
    campaignId,
    regionId: region.id,
    regionName: region.name,
    regionDescription: region.description,
    seedPrompt: 'An elven scout',
    existingNpcNames: []
  }
}

// --- narration prompt-size fixture (040.4 slim context) ----------------------

function seedNarrationGrounding(scene: DialogueScene): void {
  const { db, campaign, region, player } = scene
  for (let turn = 1; turn <= 6; turn += 1) {
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: {
        characterId: player.id,
        narrationText: `Turn ${turn}: the market crowd shifts as Kael browses the stalls.`,
        dmLineKind: 'flavor'
      }
    })
  }
  createWorldFact(db, {
    campaignId: campaign.id,
    content: 'The market bell cracked during the spring flood.',
    regionId: region.id
  })
  createLogEntry(db, {
    campaignId: campaign.id,
    characterId: player.id,
    category: 'person',
    title: 'Tessa the shopkeeper',
    content: 'Sells rope and lanterns near the bell tower.',
    learnedInGameDate: 0
  })
  createLogEntry(db, {
    campaignId: campaign.id,
    characterId: player.id,
    category: 'place',
    title: 'Market Square',
    content: 'Busy at dawn; quiet after the evening bell.',
    learnedInGameDate: 0
  })
  const quest = createQuest(db, {
    campaignId: campaign.id,
    kind: 'side',
    title: 'A Quiet Errand',
    summary: 'Deliver the ledger to the harbormaster in Saltmarsh.',
    scale: 'minor',
    objectives: [{ id: 'obj-1', text: 'Collect the ledger from the counting house', done: false }]
  })
  upsertCharacterQuest(db, {
    characterId: player.id,
    questId: quest.id,
    status: 'active',
    acceptedInGameDate: 0
  })
}

/**
 * Builds the narration prompt exactly the way the turn pipeline does — via
 * `assembleNarrationContext` + `narrate` — on a seeded campaign with recent
 * events, log entries, a world fact, and an active quest, then returns the
 * captured provider call (user prompt + GenerateContext).
 */
export async function captureNarrationPromptCall(): Promise<MockProviderCall> {
  const scene = seedDialogueScene()
  seedNarrationGrounding(scene)
  const context = await assembleNarrationContext({
    db: scene.db,
    campaignId: scene.campaign.id,
    regionId: scene.region.id,
    characterId: scene.player.id,
    playerInput: 'I ask Tessa about the cracked market bell.'
  })
  const provider = createScriptedProvider(['{"narrationText":"The bell story spills out."}'])
  await narrate(provider, { success: true, total: 14, dc: 12 }, context)
  return provider.calls[0]!
}

// --- guided identity prompt-size fixture (040.10 windowing) ------------------

/** Static identity block text expected in systemPrompt only, never the per-turn user prompt. */
export const IDENTITY_STATIC_BLOCK_MARKER = FLAGGED_NPC_RACE_LORE.summary

const IDENTITY_TURN_RESPONSE = JSON.stringify({
  dmReply: 'Tell me more about those grove oaths.',
  foundations: {
    who: { complete: false },
    why: { complete: false },
    where: { complete: false },
    what: { complete: false }
  },
  allFoundationsComplete: false
})

export function buildIdentityTranscript(
  turns: number,
  prefix = 'window'
): IdentityInterviewContext['transcript'] {
  return Array.from({ length: turns }, (_, index) => ({
    role: index % 2 === 0 ? ('dm' as const) : ('player' as const),
    content: `${prefix} exchange ${index + 1} about lineage, oaths, and bearing.`
  }))
}

function buildIdentityContext(
  transcript: IdentityInterviewContext['transcript']
): IdentityInterviewContext {
  return {
    campaignPremise: 'A frontier kingdom rebuilding after a long war.',
    characterName: 'Sylwen',
    characterClass: 'ranger',
    abilityScores: { body: 10, agility: 16, mind: 12, presence: 10 },
    alignment: 'neutral_good',
    raceName: 'Elf',
    raceLore: FLAGGED_NPC_RACE_LORE,
    backgroundLabel: 'Outlander',
    backgroundDescription:
      'You grew up far from settled lands, reading weather, game trails, and the moods of wild places.',
    backgroundStory:
      'Sylwen left the grove after the wardens fell silent. Two seasons of tracking the silence led her to the frontier, where she now guides travelers for coin and rumors.',
    startingGear: [{ name: 'Shortbow', equippedSlot: 'mainHand' }],
    knownSpellNames: [],
    regions: [
      { id: 'region-frontier', name: 'Frontier March', description: 'A rebuilt borderland.' }
    ],
    transcript,
    currentFoundations: defaultIdentityFoundations()
  }
}

/**
 * Runs one guided-identity interview turn through the real agent and returns
 * the captured provider call, so tests can measure the windowed user prompt
 * and the static systemPrompt exactly as production builds them.
 */
export async function captureIdentityPromptCall(
  transcript: IdentityInterviewContext['transcript']
): Promise<MockProviderCall> {
  const provider = createScriptedProvider([IDENTITY_TURN_RESPONSE])
  await runIdentityInterviewTurn(
    provider,
    buildIdentityContext(transcript),
    'And what drove them from the grove?'
  )
  return provider.calls[0]!
}
