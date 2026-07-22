/**
 * Player character icon generation contract (epic **144**).
 * User-initiated via create/sheet prompt — not gated by campaign generative-tokens flag.
 */

import type { ImageIdentityTraits, ImageStyleContext } from '../imageGeneration'

/** Face-token / image pipeline entity kind — player character (not NPC / companion / enemy). */
export const PLAYER_CHARACTER_ICON_ENTITY_KIND = 'player_character' as const

/**
 * Local image provider (e.g. llamacpp image path) defaults OFF for v1.
 * Player-icon tests and mock/cloud paths must not require a local LLM painter.
 */
export const DEFAULT_LOCAL_IMAGE_PROVIDER_ENABLED = false as const

export interface PlayerCharacterIconGenerateRequest {
  entityId: string
  campaignId: string
  /** Free-text appearance / look description from the player (required for Generate). */
  appearancePrompt: string
  identity: ImageIdentityTraits
  styleContext: ImageStyleContext
}

/** True when the appearance prompt is non-empty after trim (user must supply look text). */
export function hasPlayerIconAppearancePrompt(appearancePrompt: string): boolean {
  return appearancePrompt.trim().length > 0
}
