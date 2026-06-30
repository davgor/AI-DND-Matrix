import type Database from 'better-sqlite3'
import { appendEvent } from '../db/repositories/events'
import { getCharacterById, updateCharacter, type Character } from '../db/repositories/characters'
import { awardXP } from '../engine/xp'
import { PERK_HP_BONUS } from '../engine/perks'
import type { XPContext } from '../shared/progression/types'
import type { XpPassResult } from './progressionPipeline'
import type { Provider } from '../agents/providers/types'
import { resolveXpAward } from '../agents/xp'
import { clampXPProposal, resolveXPBudget, shouldSkipXpPass } from '../engine/xpBudget'
import { queueLevelUpCeremonies } from './progressionLevelUpQueue'

function persistCharacterProgress(
  db: Database.Database,
  characterId: string,
  patch: { xp?: number; level?: number; hp?: number; stats?: Record<string, unknown> }
): Character {
  updateCharacter(db, characterId, patch)
  const updated = getCharacterById(db, characterId)
  if (!updated) {
    throw new Error(`Character ${characterId} not found after update`)
  }
  return updated
}

export async function executeXpPass(input: {
  db: Database.Database
  provider: Provider
  context: XPContext
}): Promise<XpPassResult | null> {
  const { db, provider, context } = input
  const budget = resolveXPBudget(context)
  if (shouldSkipXpPass(budget)) {
    return null
  }

  const character = getCharacterById(db, context.playerCharacterId)
  if (!character) {
    return null
  }

  const agent = await resolveXpAward(provider, context, budget)
  const clamped = clampXPProposal(agent.xpAmount, budget)
  const award = awardXP({ xp: character.xp, level: character.level }, clamped.amount)
  const updated = persistCharacterProgress(db, character.id, {
    xp: award.state.xp,
    level: award.state.level,
    hp: award.leveledUp ? character.hp + PERK_HP_BONUS * award.levelsGained : character.hp
  })

  appendEvent(db, {
    campaignId: context.campaignId,
    type: 'xp_awarded',
    payload: {
      characterId: character.id,
      source: context.source,
      amount: clamped.amount,
      clamped: clamped.clamped,
      newXpTotal: award.state.xp,
      narrationText: agent.narrationText
    }
  })

  if (award.leveledUp) {
    await queueLevelUpCeremonies({
      db,
      provider,
      character: updated,
      previousLevel: character.level,
      newLevel: award.state.level
    })
  }

  return {
    xpNarration: agent.narrationText,
    xpAmount: clamped.amount,
    leveledUp: award.leveledUp,
    levelsGained: award.levelsGained
  }
}
