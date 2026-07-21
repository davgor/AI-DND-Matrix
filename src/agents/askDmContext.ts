import type Database from 'better-sqlite3'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById } from '../db/repositories/characters'
import { listEventsByCampaign } from '../db/repositories/events'

const RECENT_IC_LINE_CAP = 6

export interface AskDmContext {
  campaignId: string
  characterId: string
  campaignName: string
  campaignSummary: string
  characterName: string
  characterClass: string
  characterLevel: number
  recentIcLines: string[]
  oocTranscript: Array<{ role: 'player' | 'dm'; content: string }>
  playerQuestion: string
}

function extractIcLine(event: { type: string; payload: Record<string, unknown> }): string | null {
  const payload = event.payload
  if (typeof payload.narrationText === 'string' && payload.narrationText.trim()) {
    return `DM: ${payload.narrationText.trim()}`
  }
  if (typeof payload.playerInput === 'string' && payload.playerInput.trim()) {
    return `Player: ${payload.playerInput.trim()}`
  }
  if (typeof payload.content === 'string' && payload.content.trim()) {
    return `Player: ${payload.content.trim()}`
  }
  if (typeof payload.actionDescription === 'string' && payload.actionDescription.trim()) {
    return `Player: ${payload.actionDescription.trim()}`
  }
  return null
}

function collectRecentIcLines(db: Database.Database, campaignId: string): string[] {
  const events = listEventsByCampaign(db, campaignId, { limit: 24 })
  const lines: string[] = []
  for (const event of events) {
    const line = extractIcLine(event)
    if (!line) {
      continue
    }
    lines.push(line)
    if (lines.length >= RECENT_IC_LINE_CAP) {
      break
    }
  }
  return lines.reverse()
}

export function assembleAskDmContext(
  db: Database.Database,
  input: {
    campaignId: string
    characterId: string
    playerQuestion: string
    oocTranscript: Array<{ role: 'player' | 'dm'; content: string }>
  }
): AskDmContext | null {
  const campaign = getCampaignById(db, input.campaignId)
  const character = getCharacterById(db, input.characterId)
  if (!campaign || !character || character.campaignId !== input.campaignId) {
    return null
  }

  return {
    campaignId: input.campaignId,
    characterId: input.characterId,
    campaignName: campaign.name,
    campaignSummary: campaign.currentStateSummary,
    characterName: character.name,
    characterClass: character.characterClass,
    characterLevel: character.level,
    recentIcLines: collectRecentIcLines(db, input.campaignId),
    oocTranscript: input.oocTranscript,
    playerQuestion: input.playerQuestion
  }
}
