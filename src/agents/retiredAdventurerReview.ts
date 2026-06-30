import type { Npc } from '../db/repositories/npcs'
import { tryParseJson } from './jsonResponse'
import type { Provider } from './providers/types'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import {
  parseRetiredAdventurerReview,
  type RetiredAdventurerReviewResult
} from '../shared/npcCombat/types'

export class RetiredAdventurerReviewError extends Error {}

function buildReviewPrompt(npc: Npc): string {
  return [
    `NPC name: ${npc.name}`,
    `Role: ${npc.role}`,
    `Alignment: ${npc.alignment ?? 'unknown'}`,
    `Disposition: ${npc.disposition}`,
    `Temperament: ${npc.temperament}`,
    `Persisted backstory (read-only — do not invent or extend): ${npc.backstory}`,
    'Decide whether this NPC should use retired-adventurer combat stats.',
    'Default and expected outcome: {"upgrade":false}',
    'Return {"upgrade":true,"profile":"brawler"|"skirmisher"|"veteran"} ONLY when the backstory above already explicitly describes real combat or adventuring experience.',
    'Vague hints, scars, or toughness without explicit combat history → {"upgrade":false}.',
    'Mundane occupations (farmer, baker, clerk, dockhand) → {"upgrade":false} always.',
    'Do not add, rewrite, or extrapolate biography. Optional reason must cite existing backstory text only.',
    'Respond ONLY with JSON.'
  ].join('\n')
}

export async function reviewRetiredAdventurer(
  provider: Provider,
  npc: Npc
): Promise<RetiredAdventurerReviewResult> {
  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(buildReviewPrompt(npc))
    const parsed = tryParseJson(raw)
    return parseRetiredAdventurerReview(parsed)
  }
  return { upgrade: false }
}

export { buildReviewPrompt }
