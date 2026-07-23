import type { ImageGenerateRequest, ImageGenerateResult, ImageProvider } from '../types'
import { mapHttpStatusToImageError } from './httpImageErrors'
export function createOpenAiImageProvider(config: { apiKey: string; model: string; fetchImpl?: typeof fetch }): ImageProvider {
  const fetchFn = config.fetchImpl ?? fetch
  return { async generateImage(request: ImageGenerateRequest): Promise<ImageGenerateResult> {
    if (!config.apiKey.trim()) return { ok: false, category: 'validation', message: 'OpenAI API key is not configured.' }
    const prompt = request.prompt?.trim() || request.identity.name
    try {
      const response = await fetchFn('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify({ model: config.model, prompt, size: '256x256', response_format: 'b64_json' }) })
      if (!response.ok) return { ok: false, category: mapHttpStatusToImageError(response.status), message: `OpenAI image request failed (${response.status}).` }
      const payload = (await response.json()) as { data?: Array<{ b64_json?: string }> }
      const bytesBase64 = payload.data?.[0]?.b64_json
      if (!bytesBase64) return { ok: false, category: 'unknown', message: 'OpenAI returned no image bytes.' }
      return { ok: true, mimeType: 'image/png', bytesBase64, prompt }
    } catch (error) { return { ok: false, category: 'provider_unavailable', message: error instanceof Error ? error.message : 'OpenAI image request failed.' } }
  } }
}
