import { generateJsonWithRetry } from './jsonResponse'
import type { GenerateContext, Provider } from './providers/types'
import { buildAgentSystemPrompt } from './sharedSystemPrompts'
import {
  evaluateYieldRules,
  fallbackYieldOutcome,
  permittedYieldOutcomes,
  yieldNarrationTemplate
} from './yieldRules'
import {
  parseYieldReviewResult,
  type YieldReviewInput,
  type YieldReviewResult
} from '../shared/npcCombat/types'
import type { NpcYieldOutcome } from '../shared/combat/types'

// 040.9: schema + static guidelines ride in systemPrompt; the allowed-outcome
// list stays in the user prompt (it varies per yield) and parse clamps to it.
// 040.1: 192 — an outcome word plus a 1-2 sentence narration seed.
const YIELD_GENERATE_CONTEXT: GenerateContext = {
  systemPrompt: buildAgentSystemPrompt({
    schemaFragment: '{"outcome":string,"narrationText":string}',
    guidanceLines: [
      'Decide how this NPC responds to being at a disadvantage.',
      '"outcome" must be one of the allowed outcomes listed in the user message.',
      'Guidelines:',
      '- Cowardly, civilian, or skittish backstories: prefer surrender or flee over fight_on',
      '- Provoked villager or non-combatant who never wanted this fight: surrender at threshold',
      '- Fanatic, mindless beast, or villain who would die before yielding: fight_on may be appropriate',
      '- Non-speaking creatures (canSpeak false): cannot surrender; choose flee or incapacitated or fight_on',
      '- If player used non-lethal intent or offers mercy: never return slain',
      '- Do not invent new backstory; cite only the temperament and stored backstory in the user message',
      '"narrationText" is a short prose seed (1-2 sentences) the DM can use for narration.'
    ]
  }),
  maxTokens: 192,
  purpose: 'play.combat'
}

function buildYieldReviewPrompt(input: YieldReviewInput): string {
  const allowedList = permittedYieldOutcomes(input).join('|')
  return [
    `NPC: ${input.npcName} (${input.npcRole})`,
    `Alignment: ${input.alignment ?? 'unknown'}`,
    `Temperament: ${input.temperament}`,
    `Can speak: ${input.canSpeak}`,
    `Combat tier: ${input.combatTier}`,
    `HP: ${input.hp}/${input.maxHp} (${Math.round((input.hp / (input.maxHp || 1)) * 100)}%)`,
    `Attack lethality: ${input.lethality}`,
    `Player offers mercy: ${input.playerOffersMercy}`,
    `Backstory (read-only — do not invent or contradict): ${input.backstory || '(none)'}`,
    `Allowed outcomes: ${allowedList}`
  ].join('\n')
}

/**
 * 040.8: rules-first. The pure decision table in `yieldRules.ts` decides most
 * yields with zero LLM calls; the LLM is consulted only when the table returns
 * `ambiguous` (veteran-tier judgment calls). LLM output is clamped to
 * `permittedYieldOutcomes`, so the hard invariants (no `slain` under non-lethal
 * intent or offered mercy, no `surrender` for non-speakers, outcome within
 * `allowedOutcomes` ∪ `fight_on`) hold on every path.
 */
export async function proposeYieldOutcome(
  provider: Provider,
  input: YieldReviewInput
): Promise<YieldReviewResult> {
  const decision = evaluateYieldRules(input)
  if (decision.kind === 'outcome') {
    return { outcome: decision.outcome, narrationText: decision.narrationText }
  }
  const permitted = permittedYieldOutcomes(input)
  return generateJsonWithRetry(
    provider,
    () => buildYieldReviewPrompt(input),
    (value) => parseYieldReviewResult(value, permitted) ?? undefined,
    {
      context: YIELD_GENERATE_CONTEXT,
      fallback: () => {
        const outcome = fallbackYieldOutcome(input)
        return { outcome, narrationText: yieldNarrationTemplate(input.npcName, outcome) }
      }
    }
  )
}

export function buildYieldReviewInput(params: {
  npc: {
    name: string
    role: string
    alignment: string | null
    temperament: import('../shared/alignment/types').Temperament
    canSpeak: boolean
    combatTier: import('../shared/npcCombat/types').NpcCombatTier
    backstory: string
    hp: number | null
    maxHp: number | null
  }
  lethality: import('../shared/npcCombat/types').AttackLethality
  playerOffersMercy: boolean
  allowedOutcomes: NpcYieldOutcome[]
}): YieldReviewInput {
  return {
    npcName: params.npc.name,
    npcRole: params.npc.role,
    alignment: params.npc.alignment,
    temperament: params.npc.temperament,
    canSpeak: params.npc.canSpeak,
    combatTier: params.npc.combatTier,
    backstory: params.npc.backstory,
    hp: params.npc.hp ?? 0,
    maxHp: params.npc.maxHp ?? 0,
    lethality: params.lethality,
    playerOffersMercy: params.playerOffersMercy,
    allowedOutcomes: params.allowedOutcomes
  }
}
