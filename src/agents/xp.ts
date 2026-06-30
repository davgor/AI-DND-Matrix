import { tryParseJson } from './jsonResponse'
import type { Provider } from './providers/types'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import { clampXPProposal, resolveXPBudget } from '../engine/xpBudget'
import type { XPContext, XPBudget } from '../shared/progression/types'
import { parseXpAwardAgentResponse } from '../shared/progression/types'

export interface XpAgentResponse {
  narrationText: string
  xpAmount: number
}

export function buildXpPrompt(ctx: XPContext, budget: XPBudget): string {
  const sourceLine =
    ctx.source === 'encounter_end'
      ? `Defeated foes: ${JSON.stringify(ctx.foes.map((f) => ({ role: f.npcRole, tier: f.combatTier, outcome: f.outcome })))}`
      : `Quest hook: ${ctx.questHookText ?? '(none)'}; scale: ${ctx.questScale ?? 'minor'}`

  return [
    `XP source: ${ctx.source}`,
    sourceLine,
    `Player level: ${ctx.playerLevel}`,
    `Budget — min: ${budget.min}, max: ${budget.max}, suggested: ${budget.suggested}`,
    'Propose xpAmount within the budget. Justify narratively.',
    'Respond ONLY with JSON:',
    '{"narrationText":string,"xpAmount":number}'
  ].join('\n')
}

export async function resolveXpAward(
  provider: Provider,
  ctx: XPContext,
  budget: XPBudget
): Promise<XpAgentResponse> {
  const prompt = buildXpPrompt(ctx, budget)
  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(prompt)
    const parsed = parseXpAwardAgentResponse(tryParseJson(raw))
    if (parsed) {
      const clamped = clampXPProposal(parsed.xpAmount, budget)
      return {
        narrationText: parsed.narrationText,
        xpAmount: clamped.amount
      }
    }
  }
  return {
    narrationText: 'You feel a little wiser from the experience.',
    xpAmount: budget.suggested
  }
}

export function previewXpBudget(ctx: XPContext): XPBudget {
  return resolveXPBudget(ctx)
}
