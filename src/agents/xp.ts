import { tryParseJson } from './jsonResponse'
import type { Provider } from './providers/types'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import {
  difficultyXpNarration,
  fallbackDifficulty,
  resolveDifficultyXP
} from '../engine/difficultyXp'
import type { EncounterDifficulty, XPContext } from '../shared/progression/types'
import { ENCOUNTER_DIFFICULTIES, parseXpDifficultyAgentResponse } from '../shared/progression/types'

// The response is a single enum value (~10 output tokens); 64 leaves generous headroom.
export const XP_DIFFICULTY_MAX_TOKENS = 64

export interface XpAwardResolution {
  difficulty: EncounterDifficulty
  xpAmount: number
  narrationText: string
}

function buildPartyLine(ctx: XPContext): string {
  const player = `level ${ctx.playerLevel} player character`
  const members = (ctx.partyMembers ?? []).map((m) => `level ${m.level} ${m.archetype} companion`)
  return `Party: ${[player, ...members].join(', ')}`
}

function buildSourceLine(ctx: XPContext): string {
  if (ctx.source === 'encounter_end') {
    const foes = ctx.foes.map((f) => ({ role: f.npcRole, tier: f.combatTier, outcome: f.outcome }))
    const rounds = ctx.roundCount ? ` over ${ctx.roundCount} rounds` : ''
    return `Encounter${rounds} — defeated foes: ${JSON.stringify(foes)}`
  }
  return `Completed quest: ${ctx.questHookText ?? '(none)'}; scale: ${ctx.questScale ?? 'minor'}`
}

export function buildXpPrompt(ctx: XPContext): string {
  return [
    buildSourceLine(ctx),
    buildPartyLine(ctx),
    'Rate how difficult this accomplishment was for this party. The engine assigns XP from your rating — do not propose numbers.',
    `Respond ONLY with JSON: {"difficulty":"${ENCOUNTER_DIFFICULTIES.join('|')}"}`
  ].join('\n')
}

export async function resolveXpAward(provider: Provider, ctx: XPContext): Promise<XpAwardResolution> {
  const prompt = buildXpPrompt(ctx)
  let difficulty: EncounterDifficulty | null = null
  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS && difficulty === null; attempt += 1) {
    const raw = await provider.generate(prompt, { maxTokens: XP_DIFFICULTY_MAX_TOKENS })
    difficulty = parseXpDifficultyAgentResponse(tryParseJson(raw))?.difficulty ?? null
  }
  const rated = difficulty ?? fallbackDifficulty(ctx)
  return {
    difficulty: rated,
    xpAmount: resolveDifficultyXP(rated, ctx.playerLevel),
    narrationText: difficultyXpNarration(rated, ctx.source)
  }
}
