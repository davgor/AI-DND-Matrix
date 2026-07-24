import type { ImageGenerateRequest, ImageGenerateResult, ImageProvider } from '../../shared/imageGeneration'
export function createLocalImageProvider(config: { baseUrl: string; fetchImpl?: typeof fetch }): ImageProvider {
  const fetchFn = config.fetchImpl ?? fetch
  const base = config.baseUrl.replace(/\/$/, '')
  return {
    async generateImage(request: ImageGenerateRequest): Promise<ImageGenerateResult> {
      const prompt = request.prompt?.trim() || request.identity.name
      try {
        const response = await fetchFn(`${base}/v1/images/generations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt }) })
        if (!response.ok) return { ok: false, category: 'provider_unavailable', message: `Local image runtime failed (${response.status}).` }
        const payload = (await response.json()) as { bytesBase64?: string; mimeType?: string }
        if (!payload.bytesBase64) return { ok: false, category: 'unknown', message: 'Local runtime returned no image bytes.' }
        return { ok: true, mimeType: payload.mimeType ?? 'image/png', bytesBase64: payload.bytesBase64, prompt }
      } catch (error) {
        return { ok: false, category: 'provider_unavailable', message: error instanceof Error ? error.message : 'Local image runtime unreachable.' }
      }
    }
  }
}
