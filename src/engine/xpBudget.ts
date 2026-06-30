import type { XPContext, XPBudget, XpFoeSummary } from '../shared/progression/types'

const TIER_BASE_XP: Record<XpFoeSummary['combatTier'], number> = {
  villager: 20,
  retired_adventurer: 60,
  catalog: 40
}

const XP_EARNING_OUTCOMES = new Set(['slain', 'incapacitated', 'surrender'])

const QUEST_MINOR_RAW = 100
const QUEST_MAJOR_RAW = 325

function earningFoes(foes: XpFoeSummary[]): XpFoeSummary[] {
  return foes.filter((f) => XP_EARNING_OUTCOMES.has(f.outcome))
}

function encounterRawTotal(ctx: XPContext): number {
  const foes = earningFoes(ctx.foes)
  if (foes.length === 0) {
    return 0
  }
  const roundBonus = Math.min(30, Math.max(0, (ctx.roundCount ?? 1) - 1) * 10)
  return foes.reduce((sum, foe) => sum + TIER_BASE_XP[foe.combatTier], 0) + roundBonus
}

function questRawTotal(ctx: XPContext): number {
  return ctx.questScale === 'major' ? QUEST_MAJOR_RAW : QUEST_MINOR_RAW
}

function scaleBand(rawTotal: number, playerLevel: number): XPBudget {
  if (rawTotal <= 0) {
    return { min: 0, max: 0, suggested: 0 }
  }
  const levelDivisor = Math.max(1, playerLevel)
  const min = Math.max(0, Math.floor((rawTotal * 0.6) / levelDivisor))
  const maxBase = playerLevel > 1 ? Math.max(1, playerLevel - 1) : 1
  const max = Math.max(min, Math.floor((rawTotal * 1.2) / maxBase))
  const suggested = Math.floor((min + max) / 2)
  return { min, max, suggested }
}

/** Pure engine function — no DB or LLM imports. */
export function resolveXPBudget(ctx: XPContext): XPBudget {
  const rawTotal = ctx.source === 'quest_complete' ? questRawTotal(ctx) : encounterRawTotal(ctx)
  return scaleBand(rawTotal, ctx.playerLevel)
}

export function clampXPProposal(amount: number, budget: XPBudget): { amount: number; clamped: boolean } {
  if (budget.max === 0) {
    return { amount: 0, clamped: amount !== 0 }
  }
  const floored = Math.floor(amount)
  if (floored < budget.min) {
    return { amount: budget.min, clamped: true }
  }
  if (floored > budget.max) {
    return { amount: budget.max, clamped: true }
  }
  return { amount: floored, clamped: false }
}

export function shouldSkipXpPass(budget: XPBudget): boolean {
  return budget.max === 0
}
