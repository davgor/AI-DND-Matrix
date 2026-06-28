import type Database from 'better-sqlite3'
import type { Event } from '../db/repositories/events'
import { listEventsByCampaign } from '../db/repositories/events'
import { takeRecent } from './contextWindow'

export interface PartyMemberContext {
  characterId: string
  relationshipEvents: Event[]
}

export function assemblePartyMemberContext(
  db: Database.Database,
  campaignId: string,
  characterId: string
): PartyMemberContext {
  const allEvents = listEventsByCampaign(db, campaignId)
  const relevant = allEvents.filter((event) => event.payload['characterId'] === characterId)
  return { characterId, relationshipEvents: takeRecent(relevant) }
}
