/**
 * Reward-narration enrichment flag (epic 040.7 — loot only since ticket 061).
 *
 * By default the loot pass runs zero-LLM: a deterministic catalog loot
 * selector plus template narration. Setting `ENRICH_REWARD_NARRATION=true`
 * restores the prior LLM behavior (flavor narration, LLM-picked loot
 * including `proposeNew` homebrew items). XP is not gated by this flag:
 * ticket 061 made XP a single tiny difficulty-rating call with the engine
 * owning amounts and templated narration on every path.
 *
 * Read via `process.env` directly (not `loadRuntimeConfig`) so the flag stays
 * scoped to the loot pass and is re-evaluated per pass.
 */
export function isRewardNarrationEnrichmentEnabled(): boolean {
  return process.env['ENRICH_REWARD_NARRATION'] === 'true'
}
