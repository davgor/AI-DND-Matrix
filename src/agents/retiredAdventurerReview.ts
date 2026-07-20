import type { Npc } from '../db/repositories/npcs'
import { generateJsonWithRetry } from './jsonResponse'
import type { GenerateContext, Provider } from './providers/types'
import {
  parseRetiredAdventurerReview,
  type RetiredAdventurerReviewResult
} from '../shared/npcCombat/types'

// 040.1: 128 — a boolean, an optional profile word, and an optional short
// reason; the smallest structured response in the codebase.
const RETIRED_REVIEW_GENERATE_CONTEXT: GenerateContext = { maxTokens: 128, purpose: 'play.combat' }

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
  return generateJsonWithRetry<RetiredAdventurerReviewResult>(
    provider,
    () => buildReviewPrompt(npc),
    (parsed) => (parsed === undefined ? undefined : parseRetiredAdventurerReview(parsed)),
    {
      context: { ...RETIRED_REVIEW_GENERATE_CONTEXT, campaignId: npc.campaignId },
      fallback: () => ({ upgrade: false })
    }
  )
}

