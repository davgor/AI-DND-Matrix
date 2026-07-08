/**
 * Deterministic loot selector — the default zero-LLM loot path (epic 040.7).
 *
 * Design:
 * - **Pick strategy:** a seeded Fisher–Yates shuffle of the policy-filtered
 *   catalog candidates. The seed derives from campaign id + source + foe npc
 *   ids (or quest/thread id for quest completions), so re-running the same
 *   resolution yields identical grants while different encounters/quests
 *   naturally yield different picks.
 * - **`maxGrantCount` respected:** the grant count is a seeded pick in
 *   `[1, policy.maxGrantCount]`, capped by the candidate count; a zero cap or
 *   an empty candidate list grants nothing (`nothingToFind` downstream).
 * - **Variety guard:** item ids granted by recent `loot_resolved` events are
 *   deprioritized — fresh candidates are drawn first, and recently granted
 *   items are only re-granted once nothing fresh remains — so repeated
 *   encounters don't hand out identical items even from small candidate pools.
 */
import { createSeededRandom, type RandomFn } from '../engine/abilities'
import { hashStringSeed } from '../engine/hp'
import type { CatalogItem } from '../shared/items/types'
import type { LootContext, LootPolicy } from '../shared/loot/types'

export interface LootSelectionInput {
  candidates: CatalogItem[]
  policy: LootPolicy
  seedKey: string
  recentItemIds: readonly string[]
}

export function buildLootSeedKey(context: LootContext): string {
  const sourceRefs =
    context.source === 'quest_complete'
      ? [context.questId ?? context.questThreadId ?? '']
      : context.foes.map((foe) => foe.npcId)
  return [context.campaignId, context.source, ...sourceRefs].join('|')
}

function seededShuffle(items: CatalogItem[], rng: RandomFn): CatalogItem[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const swap = shuffled[i]!
    shuffled[i] = shuffled[j]!
    shuffled[j] = swap
  }
  return shuffled
}

export function selectLootDeterministic(input: LootSelectionInput): CatalogItem[] {
  const { candidates, policy, seedKey, recentItemIds } = input
  if (policy.maxGrantCount === 0 || candidates.length === 0) {
    return []
  }
  const rng = createSeededRandom(hashStringSeed(seedKey))
  const grantCount = Math.min(candidates.length, 1 + Math.floor(rng() * policy.maxGrantCount))
  const recent = new Set(recentItemIds)
  const shuffled = seededShuffle(candidates, rng)
  const ordered = [
    ...shuffled.filter((item) => !recent.has(item.id)),
    ...shuffled.filter((item) => recent.has(item.id))
  ]
  return ordered.slice(0, grantCount)
}
