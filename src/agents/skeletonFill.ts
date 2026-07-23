/**
 * Skeleton fill protocol (epic 161): engine owns JSON structure with {{TOKEN}} /
 * {{@TOKEN}} placeholders; the LLM returns labeled blocks <<<TOKEN>>>…<<</TOKEN>>>;
 * this module substitutes values so JSON.parse runs on an engine-authored string.
 *
 * Escape policy:
 * - `{{TOKEN}}` — JSON-string-escaped (backslash, quote, control chars as \\uXXXX)
 *   for values inside skeleton string literals; fillSkeleton does not add quotes.
 * - `{{@TOKEN}}` — raw JSON fragment insert (arrays/objects/booleans); not escaped.
 */

type FillSkeletonFailureReason =
  | 'missing_token'
  | 'unknown_token'
  | 'malformed_tag'
  | 'unclosed_tag'
  | 'duplicate_token'

type ExtractBlocksResult =
  | { ok: true; values: Record<string, string> }
  | { ok: false; reason: FillSkeletonFailureReason; token?: string; detail?: string }

type FillSkeletonResult =
  | { ok: true; jsonText: string; values: Record<string, string> }
  | { ok: false; reason: FillSkeletonFailureReason; token?: string; detail?: string }

const OPEN_TAG_PATTERN = /<<<([A-Z][A-Z0-9_]*)>>>/g
const PLACEHOLDER_PATTERN = /\{\{(@?[A-Z][A-Z0-9_]*)\}\}/g
const ANY_CLOSE_TAG = /<<<\/([A-Z][A-Z0-9_]*)>>>/g

/**
 * Escape policy:
 * - `{{TOKEN}}` — JSON-string-escaped (for values inside skeleton string quotes)
 * - `{{@TOKEN}}` — raw insert (for JSON arrays/objects/booleans the model supplies
 *   as structured text inside the labeled block; not string-escaped)
 */
function escapeJsonStringContent(value: string): string {
  let out = ''
  for (const char of value) {
    out += escapeJsonChar(char)
  }
  return out
}

function escapeJsonChar(char: string): string {
  if (char === '\\') return '\\\\'
  if (char === '"') return '\\"'
  if (char === '\n') return '\\n'
  if (char === '\r') return '\\r'
  if (char === '\t') return '\\t'
  const code = char.charCodeAt(0)
  if (code < 0x20) {
    return `\\u${code.toString(16).padStart(4, '0')}`
  }
  return char
}

function listSkeletonPlaceholders(skeleton: string): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  PLACEHOLDER_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = PLACEHOLDER_PATTERN.exec(skeleton)) !== null) {
    const token = match[1].startsWith('@') ? match[1].slice(1) : match[1]
    if (!seen.has(token)) {
      seen.add(token)
      order.push(token)
    }
  }
  return order
}

function isRawPlaceholder(skeleton: string, token: string): boolean {
  return skeleton.includes(`{{@${token}}}`)
}

function trimBlockBody(body: string): string {
  return body.replace(/^\r?\n/, '').replace(/\r?\n$/, '').trim()
}

function resolveCloseTag(
  raw: string,
  token: string,
  contentStart: number
): ExtractBlocksResult | { closeAt: number; closeLen: number } {
  ANY_CLOSE_TAG.lastIndex = contentStart
  const nextClose = ANY_CLOSE_TAG.exec(raw)
  if (!nextClose) {
    return { ok: false, reason: 'unclosed_tag', token }
  }
  if (nextClose[1] !== token) {
    return {
      ok: false,
      reason: 'malformed_tag',
      token,
      detail: `expected <<</${token}>>>, found <<</${nextClose[1]}>>>`
    }
  }
  return { closeAt: nextClose.index, closeLen: nextClose[0].length }
}

/**
 * Extract <<<TOKEN>>>…<<</TOKEN>>> blocks from raw model text.
 * Ignores surrounding prose; fails on unclosed, mismatched, or duplicate tags.
 */
export function extractLabeledBlocks(raw: string): ExtractBlocksResult {
  const values: Record<string, string> = {}
  OPEN_TAG_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  let cursor = 0
  while ((match = OPEN_TAG_PATTERN.exec(raw)) !== null) {
    if (match.index < cursor) {
      continue
    }
    const token = match[1]
    const contentStart = match.index + match[0].length
    const resolved = resolveCloseTag(raw, token, contentStart)
    if ('ok' in resolved) {
      return resolved
    }
    if (token in values) {
      return { ok: false, reason: 'duplicate_token', token }
    }
    values[token] = trimBlockBody(raw.slice(contentStart, resolved.closeAt))
    cursor = resolved.closeAt + resolved.closeLen
    OPEN_TAG_PATTERN.lastIndex = cursor
  }
  return { ok: true, values }
}

/**
 * Substitute {{TOKEN}} placeholders in an engine-authored JSON skeleton using
 * labeled blocks from raw LLM text. Returns parseable JSON text on success.
 */
export function fillSkeleton(skeleton: string, rawLlmText: string): FillSkeletonResult {
  const extracted = extractLabeledBlocks(rawLlmText)
  if (!extracted.ok) {
    return extracted
  }
  const placeholders = listSkeletonPlaceholders(skeleton)
  for (const token of Object.keys(extracted.values)) {
    if (!placeholders.includes(token)) {
      return { ok: false, reason: 'unknown_token', token }
    }
  }
  for (const token of placeholders) {
    if (!(token in extracted.values)) {
      return { ok: false, reason: 'missing_token', token }
    }
  }
  let jsonText = skeleton
  for (const token of placeholders) {
    const rawValue = extracted.values[token]
    if (isRawPlaceholder(skeleton, token)) {
      jsonText = jsonText.split(`{{@${token}}}`).join(rawValue.trim())
    } else {
      const escaped = escapeJsonStringContent(rawValue)
      jsonText = jsonText.split(`{{${token}}}`).join(escaped)
    }
  }
  return { ok: true, jsonText, values: extracted.values }
}

/** Format token→value map as labeled blocks for prompts/fixtures. */
export function formatLabeledBlocks(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([token, value]) => `<<<${token}>>>\n${value}\n<<</${token}>>>`)
    .join('\n')
}

/** Shared prompt contract for skeleton-fill stages (epic 161). */
export const SKELETON_FILL_PROMPT_RULES = [
  'Do NOT emit JSON.',
  'The engine owns the JSON structure below. Fill every {{TOKEN}} by returning labeled blocks only:',
  '<<<TOKEN>>>',
  'value text here',
  '<<</TOKEN>>>',
  'One block per token. You may add brief prose outside tags; never invent extra tokens.',
  'Put all quotes, commas, and newlines inside the block body — the engine escapes them.',
  'Tokens written as {{@TOKEN}} in the skeleton expect a raw JSON fragment (array, object, or boolean) inside the block — not a quoted string.'
].join('\n')
