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

/** True when `char` can start a JSON value or object key. */
function isJsonValueStart(char: string): boolean {
  return (
    char === '"' ||
    char === '{' ||
    char === '[' ||
    char === '-' ||
    (char >= '0' && char <= '9') ||
    char === 't' ||
    char === 'f' ||
    char === 'n'
  )
}

type CommaRepairState = {
  inString: boolean
  escape: boolean
  needComma: boolean
}

function createCommaRepairState(): CommaRepairState {
  return { inString: false, escape: false, needComma: false }
}

function handleCommaRepairInString(
  char: string,
  state: CommaRepairState,
  out: string[]
): void {
  out.push(char)
  if (state.escape) {
    state.escape = false
    return
  }
  if (char === '\\') {
    state.escape = true
    return
  }
  if (char === '"') {
    state.inString = false
    state.needComma = true
  }
}

function handleCommaRepairStructure(char: string, state: CommaRepairState, out: string[]): void {
  if (char === '"' || char === '{' || char === '[') {
    if (state.needComma) {
      out.push(',')
    }
    state.needComma = false
    if (char === '"') {
      state.inString = true
    }
    out.push(char)
    return
  }
  if (char === '}' || char === ']') {
    state.needComma = true
    out.push(char)
    return
  }
  if (char === ',' || char === ':') {
    state.needComma = false
    out.push(char)
  }
}

/** Append a number / true / false / null starting at `start`; return last index consumed. */
function appendJsonLiteral(text: string, start: number, out: string[]): number {
  let end = start
  while (end < text.length) {
    const char = text[end]!
    if (/\s/.test(char) || ',}][:{'.includes(char)) {
      break
    }
    out.push(char)
    end += 1
  }
  return end - 1
}

/**
 * Local models often omit commas between properties / array values
 * (e.g. `"summary":"..."` then `"deityName":"..."` on the next line).
 */
function insertMissingCommas(text: string): string {
  const out: string[] = []
  const state = createCommaRepairState()
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!
    if (state.inString) {
      handleCommaRepairInString(char, state, out)
      continue
    }
    if ('"{}[],:'.includes(char)) {
      handleCommaRepairStructure(char, state, out)
      continue
    }
    if (/\s/.test(char)) {
      out.push(char)
      continue
    }
    if (state.needComma && isJsonValueStart(char)) {
      out.push(',')
    }
    state.needComma = false
    i = appendJsonLiteral(text, i, out)
    state.needComma = true
  }
  return out.join('')
}

type RepairFrame = {
  kind: 'object' | 'array'
  keys: Set<string>
  expectingKey: boolean
}

function replaceTrailingCommaWithObjectSplit(out: string[], keyStart: number): void {
  for (let i = keyStart - 1; i >= 0; i -= 1) {
    const char = out[i]!
    if (/\s/.test(char)) {
      continue
    }
    if (char === ',') {
      out[i] = '}'
      out.splice(i + 1, 0, ',', '{')
    }
    return
  }
}

function handleClosedKey(keyStart: number, out: string[], stack: RepairFrame[]): void {
  const frame = stack[stack.length - 1]
  if (!frame || frame.kind !== 'object') {
    return
  }
  const key = out.slice(keyStart + 1, out.length - 1).join('')
  const parent = stack[stack.length - 2]
  if (parent?.kind === 'array' && frame.keys.has(key)) {
    replaceTrailingCommaWithObjectSplit(out, keyStart)
    frame.keys.clear()
  }
  frame.keys.add(key)
  frame.expectingKey = false
}

function pushRepairFrame(char: '{' | '[', stack: RepairFrame[]): void {
  if (char === '{') {
    stack.push({ kind: 'object', keys: new Set(), expectingKey: true })
    return
  }
  stack.push({ kind: 'array', keys: new Set(), expectingKey: false })
}

function popRepairFrame(stack: RepairFrame[]): void {
  stack.pop()
  const parent = stack[stack.length - 1]
  if (parent?.kind === 'object') {
    parent.expectingKey = false
  }
}

function markExpectingKeyAfterComma(stack: RepairFrame[]): void {
  const frame = stack[stack.length - 1]
  if (frame?.kind === 'object') {
    frame.expectingKey = true
  }
}

function clearExpectingKeyAfterColon(stack: RepairFrame[]): void {
  const frame = stack[stack.length - 1]
  if (frame?.kind === 'object') {
    frame.expectingKey = false
  }
}

function updateRepairStack(char: string, stack: RepairFrame[]): void {
  if (char === '{' || char === '[') {
    pushRepairFrame(char, stack)
    return
  }
  if (char === '}' || char === ']') {
    popRepairFrame(stack)
    return
  }
  if (char === ',') {
    markExpectingKeyAfterComma(stack)
    return
  }
  if (char === ':') {
    clearExpectingKeyAfterColon(stack)
  }
}

type DupKeyRepairState = {
  inString: boolean
  escape: boolean
  keyStart: number
  stack: RepairFrame[]
}

function createDupKeyRepairState(): DupKeyRepairState {
  return { inString: false, escape: false, keyStart: -1, stack: [] }
}

function handleDupKeyInString(char: string, state: DupKeyRepairState, out: string[]): void {
  out.push(char)
  if (state.escape) {
    state.escape = false
    return
  }
  if (char === '\\') {
    state.escape = true
    return
  }
  if (char !== '"') {
    return
  }
  state.inString = false
  if (state.keyStart >= 0) {
    handleClosedKey(state.keyStart, out, state.stack)
    state.keyStart = -1
  }
}

function handleDupKeyQuote(state: DupKeyRepairState, out: string[]): void {
  const frame = state.stack[state.stack.length - 1]
  const readingKey = frame?.kind === 'object' && frame.expectingKey
  state.keyStart = readingKey ? out.length : -1
  state.inString = true
  out.push('"')
}

/**
 * When a model mashes two array objects into one (`"summary":"...","factionAKey":"..."`),
 * a duplicate key means a new peer object should have started — insert `},{`.
 */
function splitDuplicateKeyArrayObjects(text: string): string {
  const out: string[] = []
  const state = createDupKeyRepairState()
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!
    if (state.inString) {
      handleDupKeyInString(char, state, out)
      continue
    }
    if (char === '"') {
      handleDupKeyQuote(state, out)
      continue
    }
    out.push(char)
    updateRepairStack(char, state.stack)
  }
  return out.join('')
}

/** Repair common local-model JSON drift, then parse. */
function parseJsonSlice(slice: string): unknown {
  const repaired = splitDuplicateKeyArrayObjects(insertMissingCommas(slice))
  return JSON.parse(repaired)
}

export function tryParseJson(raw: string): unknown {
  const slices = extractBalancedJsonObjectSlices(raw)
  if (slices.length === 0) {
    return undefined
  }
  const parsed: unknown[] = []
  for (const slice of slices) {
    try {
      parsed.push(parseJsonSlice(slice))
    } catch {
      return undefined
    }
  }
  return mergeParsedJsonObjects(parsed)
}

interface GenerateJsonWithRetryOptions<T> {
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
