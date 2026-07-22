import type { IntentInterpretation } from './dm'
import type { TurnRoutingPlan } from '../shared/turnRouting/types'

// === 040.3: heuristic turn-routing fast path =================================
// Deterministic routing plans for turns that are provably simple, so the merged
// intent+routing call (040.2) can be downgraded to the much smaller intent-only
// prompt (`interpretIntent`). Everything here is pure — callers assemble the
// signals from DB state and pass plain data in.
//
// Bias rule (data-integrity item 1): `dmNarration` is the sole write path for
// world facts, quests + their rewards, log book, cross-character entries,
// journal, item grants, spells, alignment, story-driven death,
// and typed world mutations (region status / NPC life — epic 130).
// EPIC-135: clear commerce/travel intents also resolve via a dedicated engine
// branch beside narration — transactional terms still defer converse/act rows
// so LLM routing can flavor, but debit/move must not starve if narration is omitted.
// Any row that omits dmNarration may only fire on turns it can PROVE are inert; every
// ambiguous signal returns null and defers to LLM routing.

interface PresentNpcSignal {
  id: string
  name: string
  /** False on the NPC's first interaction this session — a strong "state may change" signal. */
  interactedBefore: boolean
  /** Hostile NPCs can start combat or force narration on any turn — always defer. */
  isHostile: boolean
}

export interface TurnRoutingSignals {
  playerInput: string
  characterName: string
  regionName: string
  presentNpcs: PresentNpcSignal[]
  /** Active quest titles, summaries, and objective texts, flattened. */
  activeQuestTexts: string[]
  hasPendingAlignmentShift: boolean
  hasPartyMembers: boolean
  hasInactivePlayersInRegion: boolean
}

// Physical gestures safe to express without DM narration, mapped to their
// third-person form so the expressed prose stays grammatical.
const PHYSICAL_VERBS: ReadonlyMap<string, string> = new Map([
  ['draw', 'draws'],
  ['unsheathe', 'unsheathes'],
  ['sheathe', 'sheathes'],
  ['raise', 'raises'],
  ['lower', 'lowers'],
  ['ready', 'readies'],
  ['brace', 'braces'],
  ['wave', 'waves'],
  ['nod', 'nods'],
  ['bow', 'bows'],
  ['salute', 'salutes'],
  ['kneel', 'kneels'],
  ['stand', 'stands'],
  ['sit', 'sits'],
  ['crouch', 'crouches'],
  ['lean', 'leans'],
  ['stretch', 'stretches'],
  ['fold', 'folds'],
  ['cross', 'crosses'],
  ['clench', 'clenches'],
  ['mount', 'mounts'],
  ['dismount', 'dismounts']
])

// Leading verbs that keep a converse turn conversational; any other leading
// "I <verb>" phrase suggests a physical/composite action and defers to LLM.
const DIALOGUE_VERBS: ReadonlySet<string> = new Set([
  'ask', 'tell', 'say', 'greet', 'speak', 'talk', 'whisper',
  'reply', 'answer', 'question', 'inquire', 'thank'
])

const DIALOGUE_CUE_PATTERN =
  /\b(?:ask|asks|asked|tell|tells|told|say|says|said|greet|greets|speak|speaks|talk|talks)\b/i

// Verbs (and money nouns) implying commerce, item transfer, teaching, or
// recruitment — all of which persist only through a dmNarration beat.
const TRANSACTIONAL_TERMS: readonly string[] = [
  'buy', 'buys', 'buying', 'bought', 'purchase', 'purchases', 'purchasing', 'purchased',
  'sell', 'sells', 'selling', 'sold', 'trade', 'trades', 'trading', 'traded',
  'barter', 'barters', 'bartering', 'bartered', 'exchange', 'exchanges', 'exchanging', 'exchanged',
  'give', 'gives', 'giving', 'gave', 'hand', 'hands', 'handing', 'handed',
  'offer', 'offers', 'offering', 'offered', 'take', 'takes', 'taking', 'took',
  'steal', 'steals', 'stealing', 'stole', 'stolen', 'pilfer', 'snatch', 'swipe', 'pocket',
  'loot', 'loots', 'looting', 'looted', 'grab', 'grabs', 'grabbing', 'grabbed',
  'pay', 'pays', 'paying', 'paid', 'bribe', 'bribes', 'bribing', 'bribed',
  'lend', 'lends', 'lending', 'lent', 'loan', 'borrow', 'borrows', 'borrowing', 'borrowed',
  'donate', 'donates', 'donating', 'donated', 'gift', 'gifts',
  'learn', 'learns', 'learning', 'learned', 'teach', 'teaches', 'teaching', 'taught',
  'train', 'trains', 'training', 'trained', 'tip', 'tips',
  'join', 'joins', 'joining', 'joined', 'recruit', 'recruits', 'recruiting', 'recruited',
  'hire', 'hires', 'hiring', 'hired', 'deal', 'deals',
  'price', 'prices', 'cost', 'costs', 'gold', 'coin', 'coins'
]

// Place/person world-alter verbs — mutations persist only through dmNarration (130.4).
const WORLD_ALTER_TERMS: readonly string[] = [
  'burn', 'burns', 'burning', 'burned', 'burnt',
  'destroy', 'destroys', 'destroying', 'destroyed',
  'collapse', 'collapses', 'collapsing', 'collapsed',
  'massacre', 'massacres', 'massacring', 'massacred',
  'raze', 'razes', 'razing', 'razed',
  'demolish', 'demolishes', 'demolishing', 'demolished',
  'sack', 'sacks', 'sacking', 'sacked',
  'ruin', 'ruins', 'ruining', 'ruined',
  'torch', 'torches', 'torching', 'torched',
  'level', 'levels', 'leveling', 'levelled', 'leveled',
  'rebuild', 'rebuilds', 'rebuilding', 'rebuilt',
  'restore', 'restores', 'restoring', 'restored'
]

const TRANSACTIONAL_PATTERN = new RegExp(`\\b(?:${TRANSACTIONAL_TERMS.join('|')})\\b`, 'i')
const WORLD_ALTER_PATTERN = new RegExp(`\\b(?:${WORLD_ALTER_TERMS.join('|')})\\b`, 'i')

// Commas are excluded here: direct address ("Mira, ...") is normal dialogue.
// The act-row matcher rejects commas separately — physical phrases must be pure.
const MULTI_CLAUSE_PATTERN = /;| and | then /i

const LEADING_VERB_PATTERN = /^i\s+([a-z]+)\b/i

const ACT_INPUT_PATTERN = /^i\s+([a-z]+)\b([^.!?]*)[.!]?$/i

const MAX_ACT_INPUT_LENGTH = 80

// Name/region tokens shorter than this (or in the stopword set) are too
// generic to signal a quest reference.
const MIN_ENTITY_TOKEN_LENGTH = 3
const ENTITY_TOKEN_STOPWORDS: ReadonlySet<string> = new Set(['the', 'and'])

const PRONOUN_SWAPS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bmyself\b/gi, 'themselves'],
  [/\bmy\b/gi, 'their'],
  [/\bmine\b/gi, 'theirs'],
  [/\bme\b/gi, 'them']
]

function entityTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (token) => token.length >= MIN_ENTITY_TOKEN_LENGTH && !ENTITY_TOKEN_STOPWORDS.has(token)
    )
}

function textMentionsToken(text: string, token: string): boolean {
  return new RegExp(`\\b${token}\\b`, 'i').test(text)
}

function inputMentionsName(input: string, name: string): boolean {
  return entityTokens(name).some((token) => textMentionsToken(input, token))
}

/** Any active quest referencing a present NPC or the current region may tick on this turn. */
function questMentionsSceneEntity(signals: TurnRoutingSignals): boolean {
  const tokens = [
    ...signals.presentNpcs.flatMap((npc) => entityTokens(npc.name)),
    ...entityTokens(signals.regionName)
  ]
  return signals.activeQuestTexts.some((text) =>
    tokens.some((token) => textMentionsToken(text, token))
  )
}

/** True when any signal suggests this turn could change persisted state — defer to LLM. */
function inertTurnGuardBlocks(signals: TurnRoutingSignals): boolean {
  return (
    signals.hasPendingAlignmentShift ||
    signals.hasPartyMembers ||
    signals.hasInactivePlayersInRegion ||
    signals.presentNpcs.some((npc) => npc.isHostile) ||
    TRANSACTIONAL_PATTERN.test(signals.playerInput) ||
    WORLD_ALTER_PATTERN.test(signals.playerInput) ||
    questMentionsSceneEntity(signals)
  )
}

function addressesAnyNpc(signals: TurnRoutingSignals): boolean {
  if (signals.playerInput.includes('?') || DIALOGUE_CUE_PATTERN.test(signals.playerInput)) {
    return true
  }
  return signals.presentNpcs.some((npc) => inputMentionsName(signals.playerInput, npc.name))
}

function leadingVerbAllowsConverse(input: string): boolean {
  const match = LEADING_VERB_PATTERN.exec(input.trim())
  return match === null || DIALOGUE_VERBS.has(match[1]!.toLowerCase())
}

function converseEligibleNpc(signals: TurnRoutingSignals): PresentNpcSignal | null {
  if (signals.presentNpcs.length !== 1) {
    return null
  }
  const npc = signals.presentNpcs[0]!
  const input = signals.playerInput
  if (
    !npc.interactedBefore ||
    !addressesAnyNpc(signals) ||
    MULTI_CLAUSE_PATTERN.test(input) ||
    !leadingVerbAllowsConverse(input) ||
    inertTurnGuardBlocks(signals)
  ) {
    return null
  }
  return npc
}

interface PhysicalActionMatch {
  thirdPersonVerb: string
  complement: string
}

function matchPhysicalAction(input: string): PhysicalActionMatch | null {
  const trimmed = input.trim()
  if (
    trimmed.length > MAX_ACT_INPUT_LENGTH ||
    trimmed.includes(',') ||
    MULTI_CLAUSE_PATTERN.test(trimmed)
  ) {
    return null
  }
  const match = ACT_INPUT_PATTERN.exec(trimmed)
  if (!match) {
    return null
  }
  const thirdPersonVerb = PHYSICAL_VERBS.get(match[1]!.toLowerCase())
  return thirdPersonVerb ? { thirdPersonVerb, complement: match[2] ?? '' } : null
}

function describeActExpression(characterName: string, match: PhysicalActionMatch): string {
  let complement = match.complement
  for (const [pattern, replacement] of PRONOUN_SWAPS) {
    complement = complement.replace(pattern, replacement)
  }
  return `${characterName} ${match.thirdPersonVerb}${complement}`.trimEnd() + '.'
}

function converseRowPlan(signals: TurnRoutingSignals): TurnRoutingPlan | null {
  const npc = converseEligibleNpc(signals)
  if (!npc) {
    return null
  }
  return { disposition: 'converse', beats: [{ kind: 'npcResponse', npcIds: [npc.id] }] }
}

function actRowPlan(signals: TurnRoutingSignals): TurnRoutingPlan | null {
  if (addressesAnyNpc(signals) || inertTurnGuardBlocks(signals)) {
    return null
  }
  const match = matchPhysicalAction(signals.playerInput)
  if (!match) {
    return null
  }
  return {
    disposition: 'act',
    beats: [
      {
        kind: 'playerActionExpression',
        actionDescription: describeActExpression(signals.characterName, match)
      }
    ]
  }
}

/**
 * Check turns always need a dmNarration beat (the outcome-bearing, side-effect
 * write beat). The row only fires where the pre-LLM converse/act conditions
 * held — anything else keeps the (richer) LLM plan, which `ensureDmNarrationBeat`
 * already guarantees carries narration.
 */
function checkRowPlan(signals: TurnRoutingSignals): TurnRoutingPlan | null {
  const npc = converseEligibleNpc(signals)
  if (npc) {
    return {
      disposition: 'composite',
      beats: [{ kind: 'dmNarration' }, { kind: 'npcResponse', npcIds: [npc.id] }]
    }
  }
  const act = actRowPlan(signals)
  if (!act) {
    return null
  }
  return { disposition: 'composite', beats: [...act.beats, { kind: 'dmNarration' }] }
}

/**
 * Deterministic routing plan for a parsed intent, or null to defer to LLM
 * routing. Rest/travel/modifyItem and combat intents bypass beat routing
 * entirely, so they return null (no change to today's behavior).
 */
export function heuristicRoutingPlan(
  intent: IntentInterpretation,
  signals: TurnRoutingSignals
): TurnRoutingPlan | null {
  if (intent.actionType !== undefined || (intent.combatIntent ?? 'none') !== 'none') {
    return null
  }
  if (intent.checkNeeded) {
    return checkRowPlan(signals)
  }
  return converseRowPlan(signals) ?? actRowPlan(signals)
}

/**
 * Pre-LLM gate: true when raw input + turn context already prove the routing
 * plan, so the merged intent+routing call can be downgraded to the smaller
 * intent-only prompt. Whenever this returns true, `heuristicRoutingPlan`
 * returns a plan for every intent that reaches beat execution.
 */
export function canSkipRoutingLlm(signals: TurnRoutingSignals): boolean {
  return converseRowPlan(signals) !== null || actRowPlan(signals) !== null
}
