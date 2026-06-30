import type Database from 'better-sqlite3'
import { detectEmergentDirection } from '../engine/emergentDirection'
import { archetypeKitTags } from '../engine/perks'
import { xpThresholdForLevel } from '../engine/xp'
import { listEventsByCampaign } from '../db/repositories/events'
import { listCharacterJournalEntries } from '../db/repositories/characterJournalEntries'
import { listLogEntriesByCharacter } from '../db/repositories/logEntries'
import type { ActivityTagCounts, LevelSpanContext } from '../shared/progression/types'
import { inferActivityTag, inferTagsFromSnippet, summarizeEvent } from './levelSpanActivityTags'

function emptyTagCounts(): ActivityTagCounts {
  return { combat: 0, arcane: 0, social: 0, exploration: 0 }
}

function bumpTag(counts: ActivityTagCounts, tag: import('../shared/progression/types').ActivityTag): void {
  counts[tag] += 1
}

function collectSpanEvents(
  db: Database.Database,
  campaignId: string,
  characterId: string
): Array<{ type: string; payload: Record<string, unknown> }> {
  return listEventsByCampaign(db, campaignId)
    .filter((event) => event.payload.characterId === characterId)
    .map((event) => ({ type: event.type, payload: event.payload }))
}

function collectTextSnippets(characterId: string, db: Database.Database): string[] {
  const journal = listCharacterJournalEntries(db, characterId)
    .slice(-6)
    .map((entry) => entry.content.slice(0, 160))
  const logBook = listLogEntriesByCharacter(db, characterId)
    .slice(-6)
    .map((entry) => entry.content.slice(0, 160))
  return [...journal, ...logBook]
}

export function buildLevelSpanContext(input: {
  db: Database.Database
  campaignId: string
  characterId: string
  archetype: string
  newLevel: number
  spanStartXp: number
}): LevelSpanContext {
  const { db, campaignId, characterId, archetype, newLevel, spanStartXp } = input
  const activityTags = emptyTagCounts()
  const taggedEvents: Array<{ tag: string }> = []
  const recentEventSummaries: string[] = []

  for (const event of collectSpanEvents(db, campaignId, characterId)) {
    const tag = inferActivityTag(event)
    if (tag) {
      bumpTag(activityTags, tag)
      taggedEvents.push({ tag })
    }
    if (recentEventSummaries.length < 12) {
      recentEventSummaries.push(summarizeEvent(event))
    }
  }

  const snippets = collectTextSnippets(characterId, db)
  for (const snippet of snippets) {
    for (const tag of inferTagsFromSnippet(snippet)) {
      bumpTag(activityTags, tag)
      taggedEvents.push({ tag })
    }
  }

  return {
    characterId,
    campaignId,
    archetype,
    newLevel,
    spanStartXp,
    activityTags,
    emergentDirection: detectEmergentDirection({ kitTags: archetypeKitTags(archetype) }, taggedEvents),
    recentEventSummaries,
    journalSnippets: snippets.slice(0, 6),
    logBookSnippets: snippets.slice(0, 6)
  }
}

export function spanStartXpBoundaries(
  previousLevel: number,
  newLevel: number,
  lastLevelUpXp: number
): Array<{ targetLevel: number; spanStartXp: number }> {
  const ceremonies: Array<{ targetLevel: number; spanStartXp: number }> = []
  let spanStart = lastLevelUpXp
  for (let level = previousLevel + 1; level <= newLevel; level += 1) {
    ceremonies.push({ targetLevel: level, spanStartXp: spanStart })
    spanStart = xpThresholdForLevel(level)
  }
  return ceremonies
}
