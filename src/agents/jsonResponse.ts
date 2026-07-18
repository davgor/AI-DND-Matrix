import type { GenerateContext, Provider } from './providers/types'

const CODE_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/

export const MAX_SCHEMA_ATTEMPTS = 3

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  const match = CODE_FENCE_PATTERN.exec(trimmed)
  return match ? match[1] : trimmed
}

function extractJsonObject(raw: string): string {
  const stripped = stripCodeFence(raw)
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return stripped.slice(start, end + 1)
  }
  return stripped
}

export function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(extractJsonObject(raw))
  } catch {
    return undefined
  }
}

export interface GenerateJsonWithRetryOptions<T> {
  attempts?: number
  /** Optional per-call provider context (systemPrompt / maxTokens) for epic 040.9. */
  context?: GenerateContext
  /** Returned when every attempt fails to parse. */
  fallback?: () => T
  /** Thrown when every attempt fails and no fallback is set. */
  exhaustedError?: () => Error
}

/**
 * Shared generate → tryParseJson → parse → retry loop used by agent schema calls.
 * `parse` should return `undefined`/`null` to signal a retry-worthy response.
 */
export async function generateJsonWithRetry<T>(
  provider: Provider,
  prompt: string | (() => string),
  parse: (parsed: unknown) => T | undefined | null,
  options: GenerateJsonWithRetryOptions<T> = {}
): Promise<T> {
  const attempts = options.attempts ?? MAX_SCHEMA_ATTEMPTS
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const text = typeof prompt === 'function' ? prompt() : prompt
    const raw = await provider.generate(text, options.context)
    const value = parse(tryParseJson(raw))
    if (value != null) {
      return value
    }
  }
  if (options.fallback) {
    return options.fallback()
  }
  throw options.exhaustedError?.() ?? new Error('JSON schema retries exhausted')
}
