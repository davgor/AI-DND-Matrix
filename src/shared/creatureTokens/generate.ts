import type {
  ImageGenerateRequest,
  ImageGenerateResult,
  ImageProvider
} from '../imageGeneration'
import { buildCreatureTokenPrompt } from './prompt'
import type { CreatureTokenGenerateRequest } from './request'
import { CREATURE_TOKEN_ENTITY_KIND } from './types'

function toImageRequest(
  request: CreatureTokenGenerateRequest,
  prompt: string
): ImageGenerateRequest {
  return {
    entityKind: CREATURE_TOKEN_ENTITY_KIND,
    entityId: request.speciesId,
    campaignId: request.campaignId,
    identity: {
      name: request.speciesName,
      role: 'enemy',
      raceKey: null,
      genderKey: null,
      age: null,
      hairColor: null,
      eyeColor: null
    },
    styleContext: request.styleContext,
    prompt
  }
}

/**
 * Runs creature-token generation against an image provider.
 * Pure orchestration — no Electron, DB, or React imports.
 */
export async function generateCreatureToken(
  provider: ImageProvider,
  request: CreatureTokenGenerateRequest
): Promise<ImageGenerateResult> {
  const prompt = buildCreatureTokenPrompt(request)
  return provider.generateImage(toImageRequest(request, prompt))
}
