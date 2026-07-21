/**
 * Provider-agnostic image generation contract (m001.1 slice for epic 122).
 * No UI imports — consumers pass typed requests and handle typed results.
 */

export const IMAGE_ERROR_CATEGORIES = [
  'provider_unavailable',
  'timeout',
  'validation',
  'policy_rejection',
  'unknown'
] as const

export type ImageErrorCategory = (typeof IMAGE_ERROR_CATEGORIES)[number]

export interface ImageIdentityTraits {
  name: string
  role: string
  raceKey: string | null
  genderKey: string | null
  age: string | null
  hairColor: string | null
  eyeColor: string | null
}

/** Campaign visual style hook — stub fields OK for v1 face tokens. */
export interface ImageStyleContext {
  presetId: string | null
  notes: string | null
}

export interface ImageGenerateRequest {
  entityKind: string
  entityId: string
  campaignId: string
  identity: ImageIdentityTraits
  styleContext: ImageStyleContext
  /** Final prompt text; providers may ignore and rebuild from identity. */
  prompt?: string
}

export interface ImageGenerateSuccess {
  ok: true
  mimeType: string
  bytesBase64: string
  prompt: string
}

export interface ImageGenerateFailure {
  ok: false
  category: ImageErrorCategory
  message: string
}

export type ImageGenerateResult = ImageGenerateSuccess | ImageGenerateFailure

export interface ImageProvider {
  generateImage(request: ImageGenerateRequest): Promise<ImageGenerateResult>
}

export interface MockImageProviderCall {
  request: ImageGenerateRequest
}

export type MockImageProviderBehavior =
  | { mode: 'success'; mimeType: string; bytesBase64: string }
  | { mode: 'failure'; category: ImageErrorCategory; message: string }

export interface MockImageProvider extends ImageProvider {
  calls: MockImageProviderCall[]
}

export function createMockImageProvider(behavior: MockImageProviderBehavior): MockImageProvider {
  const calls: MockImageProviderCall[] = []
  return {
    calls,
    async generateImage(request: ImageGenerateRequest): Promise<ImageGenerateResult> {
      calls.push({ request })
      if (behavior.mode === 'success') {
        return {
          ok: true,
          mimeType: behavior.mimeType,
          bytesBase64: behavior.bytesBase64,
          prompt: request.prompt ?? ''
        }
      }
      return {
        ok: false,
        category: behavior.category,
        message: behavior.message
      }
    }
  }
}

export function isImageErrorCategory(value: unknown): value is ImageErrorCategory {
  return typeof value === 'string' && (IMAGE_ERROR_CATEGORIES as readonly string[]).includes(value)
}
