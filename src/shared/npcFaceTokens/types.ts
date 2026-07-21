/**
 * NPC face-token generation contract (epic **122** / legacy body **121.x**).
 * Shared with companion face tokens (**139**) via the same enqueue predicate shape.
 */

/** Face-token / image pipeline entity kind — world speaking NPC (not companion / enemy). */
export const NPC_FACE_TOKEN_ENTITY_KIND = 'speaking_npc' as const

/** Per-campaign toggle default — OFF until the player opts in. */
export const DEFAULT_NPC_FACE_TOKEN_GENERATION_ENABLED = false as const

/**
 * Local image provider (e.g. llamacpp image path) defaults OFF for v1.
 * Face-token tests and mock/cloud paths must not require a local LLM painter.
 */
export const DEFAULT_LOCAL_IMAGE_PROVIDER_ENABLED = false as const

export interface NpcFaceTokenEligibility {
  canSpeak: boolean
  /** True when a face-token asset is already bound (stable until regen policy). */
  hasFaceToken: boolean
}

/**
 * Whether a face-token job should be enqueued for an NPC.
 * Toggle OFF always skips; when ON, only speaking NPCs without a stored token enqueue.
 */
export function shouldEnqueueNpcFaceToken(
  toggleEnabled: boolean,
  eligibility?: NpcFaceTokenEligibility
): boolean {
  if (toggleEnabled !== true) {
    return false
  }
  if (eligibility === undefined) {
    return true
  }
  return eligibility.canSpeak === true && eligibility.hasFaceToken !== true
}
