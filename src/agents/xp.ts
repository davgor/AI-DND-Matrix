import { tryParseJson } from './jsonResponse'
import type { GenerateContext, Provider } from './providers/types'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import { buildAgentSystemPrompt } from './sharedSystemPrompts'
import { clampXPProposal, resolveXPBudget } from '../engine/xpBudget'
import type { XPContext, XPBudget } from '../shared/progression/types'
import { parseXpAwardAgentResponse } from '../shared/progression/types'

export interface XpAgentResponse {
  narrationText: string
  xpAmount: number
}

// 040.9: schema + standing instruction ride in systemPrompt; the one shared
// context object keeps every schema-retry attempt identical (item 11).
// 040.1: 256 — one narration line plus a number; parse failure falls back to
// budget.suggested, so a truncation-induced retry exhaustion stays in-band.
const XP_GENERATE_CONTEXT: GenerateContext = {
  systemPrompt: buildAgentSystemPrompt({
    schemaFragment: '{"narrationText":string,"xpAmount":number}',
    guidanceLines: ['Propose xpAmount within the budget. Justify narratively.']
  }),
  maxTokens: 256
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
    `Budget — min: ${budget.min}, max: ${budget.max}, suggested: ${budget.suggested}`
  ].join('\n')
}

export async function resolveXpAward(
  provider: Provider,
  ctx: XPContext,
  budget: XPBudget
): Promise<XpAgentResponse> {
  const prompt = buildXpPrompt(ctx, budget)
  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(prompt, XP_GENERATE_CONTEXT)
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
