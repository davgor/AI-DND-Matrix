import type { Event } from '../db/repositories/events'
import type { PlayLogEntry } from './narrationLog'

export function xpAwardedEntries(event: Event): PlayLogEntry[] {
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

export function perkChosenEntries(event: Event): PlayLogEntry[] {
  const payload = event.payload as { mechanicalSummary?: string }
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
