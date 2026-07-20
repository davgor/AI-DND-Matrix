import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { NpcReactionKind } from '../shared/alignment/types'
import { stripActionMarkers } from '../shared/alignment/types'
import { listEventsByCampaign, type Event } from '../db/repositories/events'
import { getDb } from './db'

export type LogSpeaker = 'dm' | 'player' | 'npc' | 'partyMember'
export type PlayerLineKind = 'raw' | 'actionExpression'

export interface PlayLogEntry {
  id: string
  timestamp: string
  speaker: LogSpeaker
  text: string
  reactionKind?: NpcReactionKind
  playerLineKind?: PlayerLineKind
  sceneSetting?: boolean
  speakerName?: string
  npcId?: string
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
  if (payload.playerInput) {
    entries.push({
      id: `${event.id}-player`,
      timestamp: event.timestamp,
      speaker: 'player',
      text: payload.playerInput,
      playerLineKind: 'raw'
    })
  }
  if (payload.actionDescription) {
    entries.push({
      id: `${event.id}-action`,
      timestamp: event.timestamp,
      speaker: 'player',
      text: stripActionMarkers(payload.actionDescription),
      playerLineKind: 'actionExpression',
      reactionKind: 'action'
    })
  }
  if (payload.narrationText) {
    entries.push({ id: `${event.id}-dm`, timestamp: event.timestamp, speaker: 'dm', text: payload.narrationText })
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
    entries.push({ id: `${event.id}-dm`, timestamp: event.timestamp, speaker: 'dm', text: payload.narrationText })
  }
  return entries
}

function npcReactionEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as {
    dialogue?: string
    text?: string
    reactionKind?: NpcReactionKind
    npcName?: string
    npcId?: string
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
      reactionKind: payload.reactionKind ?? 'dialogue',
      speakerName: typeof payload.npcName === 'string' ? payload.npcName : undefined,
      npcId: typeof payload.npcId === 'string' ? payload.npcId : undefined
    }
  ]
}

function dmNarrationOnlyEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as { narrationText?: string; auditOnly?: boolean; sceneSetting?: boolean }
  if (payload.auditOnly || typeof payload.narrationText !== 'string') {
    return []
  }
  return [
    {
      id: event.id,
      timestamp: event.timestamp,
      speaker: 'dm',
      text: payload.narrationText,
      sceneSetting: payload.sceneSetting === true
    }
  ]
}

const DM_NARRATION_EVENT_TYPES = new Set(['dying_resolution', 'loot_resolved', 'opening_scene'])

function dmNarrationEventEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as { narrationText?: string }
  if (typeof payload.narrationText !== 'string') {
    return []
  }
  return [
    {
      id: event.id,
      timestamp: event.timestamp,
      speaker: 'dm',
      text: payload.narrationText,
      sceneSetting: event.type === 'opening_scene'
    }
  ]
}

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
    return [{ id: event.id, timestamp: event.timestamp, speaker: 'dm', text: payload.narrationText }]
  }
  if (typeof payload.amount === 'number') {
    return [
      {
        id: event.id,
        timestamp: event.timestamp,
        speaker: 'dm',
        text: `You gain ${payload.amount} experience.`
      }
    ]
  }
  return []
}

function perkChosenEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as { mechanicalSummary?: string; category?: string }
  if (typeof payload.mechanicalSummary !== 'string') {
    return []
  }
  return [
    {
      id: event.id,
      timestamp: event.timestamp,
      speaker: 'dm',
      text: `Perk chosen: ${payload.mechanicalSummary}`
    }
  ]
}

function partyMemberActionEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as { content?: string; memberName?: string }
  if (typeof payload.content !== 'string') {
    return []
  }
  return [
    {
      id: event.id,
      timestamp: event.timestamp,
      speaker: 'partyMember',
      text: payload.content,
      speakerName: typeof payload.memberName === 'string' ? payload.memberName : undefined
    }
  ]
}

function eventToLogEntries(event: Event): PlayLogEntry[] {
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
    return partyMemberActionEntries(event)
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
