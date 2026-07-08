/**
 * Reward-narration enrichment flag (epic 040.7).
 *
 * By default the XP and loot passes run zero-LLM: engine-authoritative
 * amounts (`budget.suggested`), a deterministic catalog loot selector, and
 * template narration. Setting `ENRICH_REWARD_NARRATION=true` in the
 * environment restores the prior LLM behavior (flavor narration, LLM-picked
 * loot including `proposeNew` homebrew items).
 *
 * Read via `process.env` directly (not `loadRuntimeConfig`) so the flag stays
 * scoped to the reward passes and is re-evaluated per pass.
 */
export function isRewardNarrationEnrichmentEnabled(): boolean {
  return process.env['ENRICH_REWARD_NARRATION'] === 'true'
}
