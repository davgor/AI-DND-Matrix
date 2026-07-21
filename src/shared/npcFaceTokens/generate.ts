import type { ImageGenerateRequest, ImageGenerateResult, ImageProvider } from '../imageGeneration'
import { buildNpcFaceTokenPrompt } from './prompt'

/**
 * Runs face-token generation against an image provider.
 * Pure orchestration — no Electron, DB, or React imports.
 */
export async function generateNpcFaceToken(
  provider: ImageProvider,
  request: ImageGenerateRequest
): Promise<ImageGenerateResult> {
  const prompt = request.prompt ?? buildNpcFaceTokenPrompt(request)
  return provider.generateImage({ ...request, prompt })
}
