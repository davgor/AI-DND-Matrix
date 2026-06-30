import type Database from 'better-sqlite3'
import { resolveLevelUpPerks } from '../agents/levelUp'
import type { Provider } from '../agents/providers/types'
import { appendEvent } from '../db/repositories/events'
import { getCharacterById, updateCharacter, type Character } from '../db/repositories/characters'
import { getPendingLevelUpQueue, readPerkStats, writePerkStats } from './progressionPendingState'
import { buildLevelSpanContext, spanStartXpBoundaries } from './levelSpanContext'
import type { PendingLevelUpCeremony } from '../shared/progression/types'

export async function queueLevelUpCeremonies(input: {
  db: Database.Database
  provider: Provider
  character: Character
  previousLevel: number
  newLevel: number
}): Promise<void> {
  const { db, provider, character, previousLevel, newLevel } = input
  const stats = readPerkStats(character)
  const boundaries = spanStartXpBoundaries(previousLevel, newLevel, stats.lastLevelUpXp ?? 0)
  const ceremonies: PendingLevelUpCeremony[] = []

  for (const boundary of boundaries) {
    const span = buildLevelSpanContext({
      db,
      campaignId: character.campaignId,
      characterId: character.id,
      archetype: character.characterClass,
      newLevel: boundary.targetLevel,
      spanStartXp: boundary.spanStartXp
    })
    const agent = await resolveLevelUpPerks(provider, span)
    ceremonies.push({
      targetLevel: boundary.targetLevel,
      spanStartXp: boundary.spanStartXp,
      narrationText: agent.narrationText,
      perks: agent.perks
    })
    appendEvent(db, {
      campaignId: character.campaignId,
      type: 'level_up',
      payload: {
        characterId: character.id,
        oldLevel: boundary.targetLevel - 1,
        newLevel: boundary.targetLevel
      }
    })
  }

  const existing = getPendingLevelUpQueue(character)
  writePerkStats(character, { pendingLevelUpQueue: [...existing, ...ceremonies] })
  updateCharacter(db, character.id, { stats: character.stats })
  getCharacterById(db, character.id)
}
