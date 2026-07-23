import type { ImageErrorCategory } from '../types'
export function mapHttpStatusToImageError(status: number): ImageErrorCategory {
  if (status === 408 || status === 504) return 'timeout'
  if (status === 400 || status === 422) return 'validation'
  if (status === 403 || status === 451) return 'policy_rejection'
  if (status >= 500 || status === 429 || status === 503) return 'provider_unavailable'
  return 'unknown'
}
