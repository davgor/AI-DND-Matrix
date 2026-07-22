/**
 * Enemy / combat creature-token generation contract (epic **123**).
 * Parallel to NPC face tokens (**122**); separate campaign toggle and entity kind.
 */

/** Creature-token / image pipeline entity kind — bestiary enemy species (not speaking NPC). */
export const CREATURE_TOKEN_ENTITY_KIND = 'enemy_creature' as const

/** Per-campaign toggle default — OFF until the player opts in. */
export const DEFAULT_ENEMY_TOKEN_GENERATION_ENABLED = false as const

/**
 * Local image provider (e.g. llamacpp image path) defaults OFF for v1.
 * Creature-token tests and mock/cloud paths must not require a local LLM painter.
 */
export const DEFAULT_LOCAL_IMAGE_PROVIDER_ENABLED = false as const

export interface CreatureTokenEligibility {
  /** True when a creature-token asset is already bound on the species. */
  hasCreatureToken: boolean
}

/**
 * Whether a creature-token job should be enqueued for a species.
 * Toggle OFF always skips; when ON, only species without a stored token enqueue.
 */
export function shouldEnqueueCreatureToken(
  toggleEnabled: boolean,
  eligibility?: CreatureTokenEligibility
): boolean {
  if (toggleEnabled !== true) {
    return false
  }
  if (eligibility === undefined) {
    return true
  }
  return eligibility.hasCreatureToken !== true
}
