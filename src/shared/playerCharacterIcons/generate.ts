import type { ImageGenerateResult, ImageProvider } from '../imageGeneration'
import { buildPlayerCharacterIconPrompt } from './prompt'
import {
  PLAYER_CHARACTER_ICON_ENTITY_KIND,
  type PlayerCharacterIconGenerateRequest
} from './types'

/**
 * Runs player-icon generation against an image provider.
 * Pure orchestration — no Electron, DB, or React imports.
 */
export async function generatePlayerCharacterIcon(
  provider: ImageProvider,
  request: PlayerCharacterIconGenerateRequest
): Promise<ImageGenerateResult> {
  const prompt = buildPlayerCharacterIconPrompt(request)
  return provider.generateImage({
    entityKind: PLAYER_CHARACTER_ICON_ENTITY_KIND,
    entityId: request.entityId,
    campaignId: request.campaignId,
    identity: request.identity,
    styleContext: request.styleContext,
    prompt
  })
}
