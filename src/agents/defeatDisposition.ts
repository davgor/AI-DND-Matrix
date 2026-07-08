import type { DeathMode } from '../db/repositories/campaigns'
import type { Npc } from '../db/repositories/npcs'
import type { Character } from '../db/repositories/characters'
import { tryParseJson } from './jsonResponse'
import type { Provider } from './providers/types'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import { evaluateDefeatRules } from './defeatRules'
import {
  parseDefeatDispositionProposal,
  type DefeatDisposition,
  type DefeatDispositionProposal
} from '../shared/npcCombat/types'

export const NON_SPEAKING_DEFEAT_DISPOSITION: DefeatDisposition = 'leave_unconscious'

function buildDefeatPrompt(input: {
  victor: Npc
  player: Character
  deathMode: DeathMode
  encounterSummary: string
}): string {
  const { victor, player, deathMode, encounterSummary } = input
  return [
    `Victor NPC: ${victor.name} (${victor.role})`,
    `Victor alignment: ${victor.alignment ?? 'unknown'}`,
    `Victor disposition: ${victor.disposition}`,
    `Victor backstory (read-only — do not contradict or extend): ${victor.backstory}`,
    `Player: ${player.name}`,
    `Campaign death mode: ${deathMode}`,
    `Encounter context: ${encounterSummary}`,
    'Choose how the victor treats the defeated player.',
    'Disposition must follow alignment + persisted backstory already on file.',
    'Examples: lawful-good retired guard backstory → imprison; chaotic-good reformed bandit → bury_out_back.',
    'Do not invent new victor biography.',
    'Respond ONLY with JSON:',
    '{"disposition":"imprison"|"bury_out_back"|"leave_unconscious"|"execute"|"ransom"|"mercy_release","narrationText":string,"locationTag"?:string}'
  ].join('\n')
}

/**
 * 040.8: rules-first. Non-speaking victors keep their pre-existing LLM skip.
 * Speaking victors are decided by the pure alignment + backstory-keyword +
 * death-mode table in `defeatRules.ts` (which also templates `locationTag`
 * for imprison/ransom continuity); the LLM is consulted only when the table
 * returns `ambiguous`.
 */
export async function proposeDefeatDisposition(
  provider: Provider,
  input: {
    victor: Npc
    player: Character
    deathMode: DeathMode
    encounterSummary: string
  }
): Promise<DefeatDispositionProposal> {
  if (!input.victor.canSpeak) {
    return {
      disposition: NON_SPEAKING_DEFEAT_DISPOSITION,
      narrationText: `${input.victor.name} leaves you unconscious in the dust.`
    }
  }
  const decision = evaluateDefeatRules({
    victorName: input.victor.name,
    role: input.victor.role,
    alignment: input.victor.alignment,
    backstory: input.victor.backstory,
    deathMode: input.deathMode
  })
  if (decision.kind === 'proposal') {
    return decision.proposal
  }
  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(buildDefeatPrompt(input))
    const parsed = parseDefeatDispositionProposal(tryParseJson(raw))
    if (parsed) {
      return parsed
    }
  }
  return {
    disposition: 'leave_unconscious',
    narrationText: `${input.victor.name} stands over you as consciousness fades.`
  }
}

export { buildDefeatPrompt }
