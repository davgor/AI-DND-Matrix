import type { GenerateContext, Provider } from './providers/types'

const CODE_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/

export const MAX_SCHEMA_ATTEMPTS = 3

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  const match = CODE_FENCE_PATTERN.exec(trimmed)
  return match ? match[1] : trimmed
}

/**
 * Scan brace-balanced top-level `{...}` objects, respecting JSON string escapes.
 * Local models often emit two objects (e.g. worldSummary then worldHistory).
 */
function extractBalancedJsonObjectSlices(raw: string): string[] {
  const stripped = stripCodeFence(raw)
  const slices: string[] = []
  let index = 0
  while (index < stripped.length) {
    const start = stripped.indexOf('{', index)
    if (start < 0) {
      break
    }
    const end = findBalancedObjectEnd(stripped, start)
    if (end < 0) {
      break
    }
    slices.push(stripped.slice(start, end + 1))
    index = end + 1
  }
  return slices
}

function findBalancedObjectEnd(text: string, start: number): number {
  let depth = 0
  let inString = false
  let escape = false
  for (let cursor = start; cursor < text.length; cursor += 1) {
    const char = text[cursor]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (char === '\\') {
        escape = true
        continue
      }
      if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') {
      depth += 1
      continue
    }
    if (char !== '}') {
      continue
    }
    depth -= 1
    if (depth === 0) {
      return cursor
    }
  }
  return -1
}

function mergeParsedJsonObjects(values: unknown[]): unknown {
  if (values.length === 0) {
    return undefined
  }
  if (values.length === 1) {
    return values[0]
  }
  const merged: Record<string, unknown> = {}
  for (const value of values) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return undefined
    }
    Object.assign(merged, value as Record<string, unknown>)
  }
  return merged
}

export function tryParseJson(raw: string): unknown {
  const slices = extractBalancedJsonObjectSlices(raw)
  if (slices.length === 0) {
    return undefined
  }
  const parsed: unknown[] = []
  for (const slice of slices) {
    try {
      parsed.push(JSON.parse(slice))
    } catch {
      return undefined
    }
  }
  return mergeParsedJsonObjects(parsed)
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
