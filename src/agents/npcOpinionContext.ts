import type Database from 'better-sqlite3'
import { listEventsByCampaign, type Event } from '../db/repositories/events'
import { listNpcMemoriesByNpc } from '../db/repositories/npcMemories'
import type { Npc } from '../db/repositories/npcs'
import {
  slimEvent,
  takeRecentWithinBudget,
  windowNpcMemories,
  type SlimEvent,
  type SlimNpcMemory
} from './contextSlim'

const OPINION_DIALOGUE_BUDGET = { minCount: 5, maxCount: 15, charBudget: 1200 }
const OPINION_ACTION_BUDGET = { minCount: 5, maxCount: 20, charBudget: 1500 }

interface AssembleNpcOpinionContextInput {
  campaignId: string
  characterId: string
  npc: Npc
}

export interface NpcOpinionContext {
  campaignId: string
  characterId: string
  npcName: string
  role: string
  disposition: string
  temperament: string
  canSpeak: boolean
  alignment: string | null
  memories?: SlimNpcMemory[]
  dialogueSnippets?: string[]
  actionBeats?: SlimEvent[]
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readNpcId(payload: Record<string, unknown>): string | undefined {
  return readString(payload, 'npcId')
}

function readReactionKind(payload: Record<string, unknown>): string | undefined {
  return readString(payload, 'reactionKind')
}

function readCombatNpcId(payload: Record<string, unknown>, role: 'attacker' | 'target'): string | undefined {
  const participant = payload[role]
  if (typeof participant !== 'object' || participant === null) {
    return undefined
  }
  const row = participant as Record<string, unknown>
  if (row['kind'] === 'npc' && typeof row['id'] === 'string') {
    return row['id']
  }
  return undefined
}

function eventInvolvesNpc(event: Event, npcId: string): boolean {
  const payload = event.payload
  if (readNpcId(payload) === npcId) {
    return true
  }
  if (readString(payload, 'targetNpcId') === npcId) {
    return true
  }
  return readCombatNpcId(payload, 'attacker') === npcId || readCombatNpcId(payload, 'target') === npcId
}

function isActionEventForNpc(event: Event, npcId: string): boolean {
  if (!eventInvolvesNpc(event, npcId)) {
    return false
  }
  if (event.type === 'combat_attack' || event.type === 'player_attack_npc') {
    return true
  }
  if (event.type === 'npc_reaction') {
    return readReactionKind(event.payload) === 'action'
  }
  return false
}

interface DialogueSnippetContext {
  npcId: string
  npcName: string
  characterId: string
}

function tryAppendPlayerDialogue(
  event: Event,
  next: Event | undefined,
  ctx: DialogueSnippetContext,
  snippets: string[]
): void {
  if (event.type !== 'player_action') {
    return
  }
  if (readString(event.payload, 'characterId') !== ctx.characterId) {
    return
  }
  const playerInput = readString(event.payload, 'playerInput')
  if (
    !playerInput ||
    next?.type !== 'npc_reaction' ||
    readNpcId(next.payload) !== ctx.npcId ||
    readReactionKind(next.payload) !== 'dialogue'
  ) {
    return
  }
  snippets.push(`Player: ${playerInput}`)
}

function tryAppendNpcDialogue(event: Event, ctx: DialogueSnippetContext, snippets: string[]): void {
  if (
    event.type !== 'npc_reaction' ||
    readNpcId(event.payload) !== ctx.npcId ||
    readReactionKind(event.payload) !== 'dialogue'
  ) {
    return
  }
  const text = readString(event.payload, 'text')
  if (text) {
    snippets.push(`${ctx.npcName}: ${text}`)
  }
}

function collectDialogueSnippets(events: Event[], npcId: string, npcName: string, characterId: string): string[] {
  const ctx: DialogueSnippetContext = { npcId, npcName, characterId }
  const snippets: string[] = []
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index] as Event
    tryAppendPlayerDialogue(event, events[index + 1], ctx, snippets)
    tryAppendNpcDialogue(event, ctx, snippets)
  }
  return takeRecentWithinBudget(snippets, OPINION_DIALOGUE_BUDGET, (line) => line.length)
}

function collectActionBeats(events: Event[], npcId: string): SlimEvent[] {
  const matched = events.filter((event) => isActionEventForNpc(event, npcId))
  const slimmed = matched.map((event) => slimEvent(event))
  return takeRecentWithinBudget(slimmed, OPINION_ACTION_BUDGET, (beat) => {
    const narration = beat.narrationText ?? ''
    const summary = beat.summary ?? ''
    return narration.length + summary.length + beat.type.length
  })
}

export function assembleNpcOpinionContext(
  db: Database.Database,
  input: AssembleNpcOpinionContextInput
): NpcOpinionContext {
  const { npc, campaignId } = input
  const base: NpcOpinionContext = {
    campaignId,
    characterId: input.characterId,
    npcName: npc.name,
    role: npc.role,
    disposition: npc.disposition,
    temperament: npc.temperament,
    canSpeak: npc.canSpeak,
    alignment: npc.alignment
  }
  const events = listEventsByCampaign(db, campaignId)

  if (npc.canSpeak) {
    return {
      ...base,
      memories: windowNpcMemories(listNpcMemoriesByNpc(db, npc.id)),
      dialogueSnippets: collectDialogueSnippets(events, npc.id, npc.name, input.characterId)
    }
  }

  return {
    ...base,
    actionBeats: collectActionBeats(events, npc.id)
  }
}
