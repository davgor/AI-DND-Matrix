import type { Event } from '../db/repositories/events'
import type { NpcMemory } from '../db/repositories/npcMemories'
import type { WorldFact } from '../db/repositories/worldFacts'
import type { LogCategory, LogEntry } from '../shared/logBook/types'
import { takeRecent } from './contextWindow'

// === 040.4: shared slim serializers — prompts get compact shapes, never raw DB rows. ===
// Count-windowing lives in contextWindow/logBookWindow; this module is purely about
// field shape, applied at context-assembly/prompt-build time (DB reads stay full rows).

/** Per-field cap keeping each slim event's serialized size bounded. */
export const EVENT_TEXT_MAX_LENGTH = 300

/** NPC prompts see at most this many region/faction world facts (most recent first). */
export const WORLD_FACT_WINDOW = 10

export interface SlimEvent {
  type: string
  narrationText?: string
  summary?: string
}

export interface SlimLogEntry {
  id: string
  category: LogCategory
  title: string
  content: string
  relatedEntityId?: string
}

export interface SlimNpcMemory {
  content: string
}

function truncate(text: string): string {
  if (text.length <= EVENT_TEXT_MAX_LENGTH) {
    return text
  }
  return `${text.slice(0, EVENT_TEXT_MAX_LENGTH - 1)}…`
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readCombatantKind(value: unknown): string {
  if (typeof value === 'object' && value !== null) {
    const kind = (value as Record<string, unknown>)['kind']
    if (typeof kind === 'string') {
      return kind
    }
  }
  return 'combatant'
}

function summarizeCombatAttack(payload: Record<string, unknown>): string | undefined {
  const attacker = readCombatantKind(payload['attacker'])
  const target = readCombatantKind(payload['target'])
  if (payload['hit'] !== true) {
    return `${attacker} missed ${target}`
  }
  const damage = typeof payload['damage'] === 'number' ? payload['damage'] : 0
  const defeated = payload['targetDefeated'] === true ? ' — target defeated' : ''
  return `${attacker} hit ${target} for ${damage} damage${defeated}`
}

function speakerSummary(
  payload: Record<string, unknown>,
  nameKey: string,
  textKey: string
): string | undefined {
  const text = readString(payload, textKey)
  if (!text) {
    return undefined
  }
  const name = readString(payload, nameKey)
  return name ? `${name}: ${text}` : text
}

function summarizePlayerAction(payload: Record<string, unknown>): string | undefined {
  const playerInput = readString(payload, 'playerInput')
  return playerInput ? `Player: ${playerInput}` : undefined
}

type EventSummarizer = (payload: Record<string, unknown>) => string | undefined

const EVENT_SUMMARIZERS: Record<string, EventSummarizer> = {
  combat_attack: summarizeCombatAttack,
  npc_reaction: (payload) => speakerSummary(payload, 'npcName', 'text'),
  party_member_action: (payload) => speakerSummary(payload, 'memberName', 'content'),
  inactive_player_action: (payload) => readString(payload, 'content'),
  player_action_expression: (payload) => readString(payload, 'actionDescription'),
  player_action: summarizePlayerAction
}

// Generic compact fallback for event types without a dedicated summarizer: first
// descriptive text field wins — never the raw payload, which can carry ids/blobs.
const FALLBACK_SUMMARY_KEYS = ['content', 'text', 'actionDescription', 'playerInput'] as const

function deriveFallbackSummary(payload: Record<string, unknown>): string | undefined {
  for (const key of FALLBACK_SUMMARY_KEYS) {
    const value = readString(payload, key)
    if (value) {
      return value
    }
  }
  return undefined
}

function deriveSummary(event: Event, narrationText: string | undefined): string | undefined {
  const summarize = EVENT_SUMMARIZERS[event.type]
  if (summarize) {
    return summarize(event.payload)
  }
  return narrationText ? undefined : deriveFallbackSummary(event.payload)
}

export function slimEvent(event: Event): SlimEvent {
  const narrationText = readString(event.payload, 'narrationText')
  const summary = deriveSummary(event, narrationText)
  const slim: SlimEvent = { type: event.type }
  if (narrationText) {
    slim.narrationText = truncate(narrationText)
  }
  if (summary) {
    slim.summary = truncate(summary)
  }
  return slim
}

export function slimEvents(events: Event[]): SlimEvent[] {
  return events.map(slimEvent)
}

export function slimLogEntry(entry: LogEntry): SlimLogEntry {
  const slim: SlimLogEntry = {
    id: entry.id,
    category: entry.category,
    title: entry.title,
    content: entry.content
  }
  if (entry.relatedEntityId) {
    slim.relatedEntityId = entry.relatedEntityId
  }
  return slim
}

export function slimLogEntries(entries: LogEntry[]): SlimLogEntry[] {
  return entries.map(slimLogEntry)
}

export function slimWorldFacts(
  facts: WorldFact[],
  limit: number = WORLD_FACT_WINDOW
): string[] {
  return takeRecent(facts, limit).map((fact) => fact.content)
}

export function slimNpcMemories(memories: NpcMemory[]): SlimNpcMemory[] {
  return memories.map((memory) => ({ content: memory.content }))
}
