import { tryParseJson } from './jsonResponse'
import type { Provider } from './providers/types'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import {
  parseYieldReviewResult,
  type NpcYieldReviewOutcome,
  type YieldReviewInput,
  type YieldReviewResult
} from '../shared/npcCombat/types'
import type { NpcYieldOutcome } from '../shared/combat/types'

function buildYieldReviewPrompt(input: YieldReviewInput): string {
  const allowedList = [...input.allowedOutcomes, 'fight_on'].join('|')
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
    '',
    'Decide how this NPC responds to being at a disadvantage.',
    `Allowed outcomes: ${allowedList}`,
    'Guidelines:',
    '- Cowardly, civilian, or skittish backstories: prefer surrender or flee over fight_on',
    '- Provoked villager or non-combatant who never wanted this fight: surrender at threshold',
    '- Fanatic, mindless beast, or villain who would die before yielding: fight_on may be appropriate',
    '- Non-speaking creatures (canSpeak false): cannot surrender; choose flee or incapacitated or fight_on',
    '- If player used non-lethal intent or offers mercy: never return slain',
    '- Do not invent new backstory; cite only the temperament and stored backstory above',
    'Respond ONLY with JSON: {"outcome":"' + allowedList + '","narrationText":string}',
    '"narrationText" is a short prose seed (1-2 sentences) the DM can use for narration.'
  ].join('\n')
}

function defaultYieldOutcome(input: YieldReviewInput): NpcYieldReviewOutcome {
  if (input.lethality === 'non_lethal') {
    return 'incapacitated'
  }
  if (input.combatTier === 'villager') {
    return 'surrender'
  }
  return 'incapacitated'
}

export async function proposeYieldOutcome(
  provider: Provider,
  input: YieldReviewInput
): Promise<YieldReviewResult> {
  const allowed: readonly NpcYieldReviewOutcome[] = [...input.allowedOutcomes, 'fight_on']
  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(buildYieldReviewPrompt(input))
    const parsed = parseYieldReviewResult(tryParseJson(raw), allowed)
    if (parsed) {
      return parsed
    }
  }
  const outcome = defaultYieldOutcome(input)
  return {
    outcome,
    narrationText: `${input.npcName} ${outcome === 'surrender' ? 'drops their weapon and raises their hands' : 'collapses unconscious'}.`
  }
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
