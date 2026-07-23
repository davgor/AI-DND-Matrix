import type { ImageProvider } from '../types'
export function createGeminiImageProvider(_config: { apiKey: string; model: string }): ImageProvider {
  return { async generateImage() { return { ok: false, category: 'unknown', message: 'Gemini stub' } } }
}
export function createGrokImageProvider(_config: { apiKey: string; model: string }): ImageProvider {
  return { async generateImage() { return { ok: false, category: 'unknown', message: 'Grok stub' } } }
}
export function createPlayer2ImageProvider(_config: { baseUrl: string }): ImageProvider {
  return { async generateImage() { return { ok: false, category: 'unknown', message: 'Player2 stub' } } }
}
