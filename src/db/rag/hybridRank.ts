/**
 * Hard cap on RAG chunk rows injected into a single agent prompt.
 *
 * Aligns with epic **040** prompt hygiene: world-fact and NPC-memory budgets
 * already cap serialized lore (~30 facts / ~60 memories), and narration smoke
 * targets ~2600 chars user prompt. Twelve chunks keeps retrieved grounding
 * well below those combined ceilings while leaving headroom for always-on
 * mechanical fields.
 */
export const RAG_CHUNK_INJECTION_CAP = 12

export interface HybridRankCandidate {
  sourceTable: string
  sourceId: string
  text: string
  semanticScore: number
  tagMatch?: boolean
  /** Normalized 0..1; newer rows score higher. Optional. */
  recencyScore?: number
}

const SEMANTIC_WEIGHT = 0.7
const TAG_MATCH_WEIGHT = 0.2
const RECENCY_WEIGHT = 0.1

/**
 * Hybrid relevance score combining semantic similarity, optional tag match,
 * and optional recency boost.
 *
 * Formula: `semanticScore * 0.7 + (tagMatch ? 0.2 : 0) + (recencyScore ?? 0) * 0.1`
 *
 * Weights favor semantic retrieval (primary signal once the index is warm) while
 * letting tag match and recency break ties and surface scope-relevant lore
 * without exceeding the injection cap enforced by {@link selectHybridRankedChunks}.
 */
export function hybridRankScore(candidate: HybridRankCandidate): number {
  const tagBoost = candidate.tagMatch ? TAG_MATCH_WEIGHT : 0
  const recencyBoost = (candidate.recencyScore ?? 0) * RECENCY_WEIGHT
  return candidate.semanticScore * SEMANTIC_WEIGHT + tagBoost + recencyBoost
}

/**
 * Sort candidates by {@link hybridRankScore} descending and slice to `cap`
 * (default {@link RAG_CHUNK_INJECTION_CAP}).
 */
export function selectHybridRankedChunks(
  candidates: HybridRankCandidate[],
  cap: number = RAG_CHUNK_INJECTION_CAP
): HybridRankCandidate[] {
  if (cap <= 0) {
    return []
  }

  return [...candidates]
    .sort((left, right) => hybridRankScore(right) - hybridRankScore(left))
    .slice(0, cap)
}
