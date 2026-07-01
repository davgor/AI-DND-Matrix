import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { NpcReactionKind } from '../shared/alignment/types'
import { stripActionMarkers } from '../shared/alignment/types'
import { listEventsByCampaign, type Event } from '../db/repositories/events'
import { getDb } from './db'

export type LogSpeaker = 'dm' | 'player' | 'npc' | 'partyMember'
export type PlayerLineKind = 'raw' | 'actionExpression'
export type DmLineKind = 'scene' | 'flavor'

export interface PlayLogEntry {
  id: string
  timestamp: string
  speaker: LogSpeaker
  text: string
  reactionKind?: NpcReactionKind
  playerLineKind?: PlayerLineKind
  dmLineKind?: DmLineKind
}

function dmLineKindFromPayload(payload: Record<string, unknown>): DmLineKind {
  const kind = payload['dmLineKind']
  return kind === 'scene' ? 'scene' : 'flavor'
}

function dmLogEntry(
  event: Event,
  text: string,
  dmLineKind: DmLineKind
): PlayLogEntry {
  return { id: event.id, timestamp: event.timestamp, speaker: 'dm', text, dmLineKind }
}

function legacyPlayerInputAndNarrationEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as {
    auditOnly?: boolean
    playerInput?: string
    narrationText?: string
    actionDescription?: string
  }
  if (payload.auditOnly) {
    return []
  }
  const entries: PlayLogEntry[] = []
  if (payload.actionDescription) {
    entries.push({
      id: `${event.id}-action`,
      timestamp: event.timestamp,
      speaker: 'player',
      text: stripActionMarkers(payload.actionDescription),
      playerLineKind: 'actionExpression',
      reactionKind: 'action'
    })
  } else if (payload.playerInput) {
    entries.push({
      id: `${event.id}-player`,
      timestamp: event.timestamp,
      speaker: 'player',
      text: payload.playerInput,
      playerLineKind: 'raw'
    })
  }
  if (payload.narrationText) {
    entries.push({
      id: `${event.id}-dm`,
      timestamp: event.timestamp,
      speaker: 'dm',
      text: payload.narrationText,
      dmLineKind: dmLineKindFromPayload(payload as Record<string, unknown>)
    })
  }
  return entries
}

function playerActionExpressionEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as { actionDescription?: string }
  if (typeof payload.actionDescription !== 'string') {
    return []
  }
  return [
    {
      id: event.id,
      timestamp: event.timestamp,
      speaker: 'player',
      text: stripActionMarkers(payload.actionDescription),
      playerLineKind: 'actionExpression',
      reactionKind: 'action'
    }
  ]
}

function playerInputAndNarrationEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as { playerInput?: string; narrationText?: string }
  const entries: PlayLogEntry[] = []
  if (payload.playerInput) {
    entries.push({
      id: `${event.id}-player`,
      timestamp: event.timestamp,
      speaker: 'player',
      text: payload.playerInput,
      playerLineKind: 'raw'
    })
  }
  if (payload.narrationText) {
    entries.push(dmLogEntry(event, payload.narrationText, 'scene'))
  }
  return entries
}

function singleTextEntry(event: Event, speaker: LogSpeaker, field: string): PlayLogEntry[] {
  const text = (event.payload as Record<string, unknown>)[field]
  return typeof text === 'string' ? [{ id: event.id, timestamp: event.timestamp, speaker, text }] : []
}

function npcReactionEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as {
    dialogue?: string
    text?: string
    reactionKind?: NpcReactionKind
  }
  const text = payload.text ?? payload.dialogue
  if (typeof text !== 'string') {
    return []
  }
  return [
    {
      id: event.id,
      timestamp: event.timestamp,
      speaker: 'npc',
      text: payload.reactionKind === 'action' ? stripActionMarkers(text) : text,
      reactionKind: payload.reactionKind ?? 'dialogue'
    }
  ]
}

function dmNarrationOnlyEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as { narrationText?: string; auditOnly?: boolean }
  if (payload.auditOnly || typeof payload.narrationText !== 'string') {
    return []
  }
  return [dmLogEntry(event, payload.narrationText, dmLineKindFromPayload(payload as Record<string, unknown>))]
}

const DM_NARRATION_EVENT_TYPES = new Set(['dying_resolution', 'loot_resolved', 'opening_scene'])

function progressionEventEntries(event: Event): PlayLogEntry[] | null {
  if (event.type === 'xp_awarded') {
    return xpAwardedEntries(event)
  }
  if (event.type === 'perk_chosen') {
    return perkChosenEntries(event)
  }
  return null
}

function xpAwardedEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as { narrationText?: string; amount?: number }
  if (typeof payload.narrationText === 'string') {
    return [dmLogEntry(event, payload.narrationText, 'flavor')]
  }
  if (typeof payload.amount === 'number') {
    return [dmLogEntry(event, `You gain ${payload.amount} experience.`, 'flavor')]
  }
  return []
}

function perkChosenEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as { mechanicalSummary?: string; category?: string }
  if (typeof payload.mechanicalSummary !== 'string') {
    return []
  }
  return [dmLogEntry(event, `Perk chosen: ${payload.mechanicalSummary}`, 'flavor')]
}

function dmNarrationEventEntries(event: Event): PlayLogEntry[] {
  const text = (event.payload as Record<string, unknown>)['narrationText']
  if (typeof text !== 'string') {
    return []
  }
  const dmLineKind: DmLineKind = event.type === 'opening_scene' ? 'scene' : 'flavor'
  return [dmLogEntry(event, text, dmLineKind)]
}

export function eventToLogEntries(event: Event): PlayLogEntry[] {
  const progression = progressionEventEntries(event)
  if (progression) {
    return progression
  }
  if (event.type === 'player_action_expression') {
    return playerActionExpressionEntries(event)
  }
  if (event.type === 'player_action') {
    const legacy = legacyPlayerInputAndNarrationEntries(event)
    return legacy.length > 0 ? legacy : dmNarrationOnlyEntries(event)
  }
  if (event.type === 'rest' || event.type === 'travel') {
    return playerInputAndNarrationEntries(event)
  }
  if (event.type === 'npc_reaction') {
    return npcReactionEntries(event)
  }
  if (event.type === 'party_member_action') {
    return singleTextEntry(event, 'partyMember', 'content')
  }
  if (DM_NARRATION_EVENT_TYPES.has(event.type)) {
    return dmNarrationEventEntries(event)
  }
  return []
}

export function buildNarrationLog(
  db: Database.Database,
  campaignId: string,
  characterId?: string
): PlayLogEntry[] {
  const events = listEventsByCampaign(db, campaignId)
  const scoped = characterId
    ? events.filter((event) => {
        const payloadCharacterId = event.payload['characterId']
        return payloadCharacterId === undefined || payloadCharacterId === characterId
      })
    : events
  return scoped.flatMap(eventToLogEntries)
}

export function registerNarrationLogHandlers(): void {
  ipcMain.handle(
    'campaigns:getNarrationLog',
    (_event, campaignId: string, characterId?: string) =>
      buildNarrationLog(getDb(), campaignId, characterId)
  )
}
