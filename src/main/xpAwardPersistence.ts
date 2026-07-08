import type Database from 'better-sqlite3'
import { createSeededRandom } from '../engine/abilities'
import { appendEvent } from '../db/repositories/events'
import { getCharacterById, updateCharacter, type Character } from '../db/repositories/characters'
import { awardXP } from '../engine/xp'
import { applyLevelUpHitDice, hashStringSeed, type Archetype } from '../engine/hp'
import type { CharacterHpStats } from '../shared/hp/types'
import type { XPContext, XPBudget } from '../shared/progression/types'
import type { XpPassResult } from './progressionPipeline'
import type { Provider } from '../agents/providers/types'
import { resolveXpAward, type XpAgentResponse } from '../agents/xp'
import { clampXPProposal, resolveXPBudget, shouldSkipXpPass } from '../engine/xpBudget'
import { isRewardNarrationEnrichmentEnabled } from './rewardEnrichment'
import { xpNarrationTemplate } from './rewardNarrationTemplates'
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

function applyLevelUpHp(
  character: Character,
  levelsGained: number
): { hp: number; stats: Record<string, unknown> } {
  const stats = { ...(character.stats as Record<string, unknown>) } as CharacterHpStats & Record<string, unknown>
  const archetype = character.characterClass as Archetype
  const bodyScore = stats.abilityScores?.body ?? 10
  const existingRolls = stats.hitDieRolls ?? []
  const rng = createSeededRandom(hashStringSeed(`${character.id}:level:${character.level}`))
  const levelUp = applyLevelUpHitDice({
    archetype,
    bodyScore,
    existingRolls,
    levelsGained,
    rng
  })
  return {
    hp: character.hp + levelUp.hpGain,
    stats: { ...stats, hitDieRolls: levelUp.hitDieRolls, maxHp: levelUp.maxHp }
  }
}

function recordXpAward(
  db: Database.Database,
  input: {
    context: XPContext
    characterId: string
    clamped: { amount: number; clamped: boolean }
    newXpTotal: number
    narrationText: string
  }
): void {
  appendEvent(db, {
    campaignId: input.context.campaignId,
    type: 'xp_awarded',
    payload: {
      characterId: input.characterId,
      source: input.context.source,
      amount: input.clamped.amount,
      clamped: input.clamped.clamped,
      newXpTotal: input.newXpTotal,
      narrationText: input.narrationText
    }
  })
}

/**
 * Default zero-LLM path (040.7): the persisted amount is always the engine
 * `budget.suggested`, so `xp_awarded.clamped` is always false on this path —
 * an accepted, intended behavior change, not a bug. Setting
 * `ENRICH_REWARD_NARRATION=true` restores the prior LLM-proposed amounts and
 * flavor narration.
 */
async function resolveXpOutcome(
  provider: Provider,
  context: XPContext,
  budget: XPBudget
): Promise<XpAgentResponse> {
  if (isRewardNarrationEnrichmentEnabled()) {
    return resolveXpAward(provider, context, budget)
  }
  return { narrationText: xpNarrationTemplate(context.source), xpAmount: budget.suggested }
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

  const agent = await resolveXpOutcome(provider, context, budget)
  const clamped = clampXPProposal(agent.xpAmount, budget)
  const award = awardXP({ xp: character.xp, level: character.level }, clamped.amount)
  const levelPatch = award.leveledUp ? applyLevelUpHp(character, award.levelsGained) : null
  const updated = persistCharacterProgress(db, character.id, {
    xp: award.state.xp,
    level: award.state.level,
    ...(levelPatch ? { hp: levelPatch.hp, stats: levelPatch.stats } : { hp: character.hp })
  })

  recordXpAward(db, {
    context,
    characterId: character.id,
    clamped,
    newXpTotal: award.state.xp,
    narrationText: agent.narrationText
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
