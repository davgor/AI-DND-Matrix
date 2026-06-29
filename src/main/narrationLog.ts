import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { NpcReactionKind } from '../shared/alignment/types'
import { stripActionMarkers } from '../shared/alignment/types'
import { listEventsByCampaign, type Event } from '../db/repositories/events'
import { getDb } from './db'

export type LogSpeaker = 'dm' | 'player' | 'npc' | 'partyMember'

export interface PlayLogEntry {
  id: string
  timestamp: string
  speaker: LogSpeaker
  text: string
  reactionKind?: NpcReactionKind
}

function playerInputAndNarrationEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as { playerInput?: string; narrationText?: string }
  const entries: PlayLogEntry[] = []
  if (payload.playerInput) {
    entries.push({ id: `${event.id}-player`, timestamp: event.timestamp, speaker: 'player', text: payload.playerInput })
  }
  if (payload.narrationText) {
    entries.push({ id: `${event.id}-dm`, timestamp: event.timestamp, speaker: 'dm', text: payload.narrationText })
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

function eventToLogEntries(event: Event): PlayLogEntry[] {
  switch (event.type) {
    case 'player_action':
    case 'rest':
    case 'travel':
      return playerInputAndNarrationEntries(event)
    case 'npc_reaction':
      return npcReactionEntries(event)
    case 'party_member_action':
      return singleTextEntry(event, 'partyMember', 'content')
    case 'dying_resolution':
      return singleTextEntry(event, 'dm', 'narrationText')
    case 'opening_scene':
      return singleTextEntry(event, 'dm', 'narrationText')
    default:
      return []
  }
}

export function buildNarrationLog(db: Database.Database, campaignId: string): PlayLogEntry[] {
  return listEventsByCampaign(db, campaignId).flatMap(eventToLogEntries)
}

export function registerNarrationLogHandlers(): void {
  ipcMain.handle('campaigns:getNarrationLog', (_event, campaignId: string) =>
    buildNarrationLog(getDb(), campaignId)
  )
}
