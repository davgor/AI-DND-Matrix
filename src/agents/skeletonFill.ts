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

export type FillSkeletonFailureReason =
  | 'missing_token'
  | 'malformed_tag'
  | 'unclosed_tag'
  | 'duplicate_token'

type ExtractBlocksResult =
  | { ok: true; values: Record<string, string> }
  | { ok: false; reason: FillSkeletonFailureReason; token?: string; detail?: string }

export type FillSkeletonResult =
  | { ok: true; jsonText: string; values: Record<string, string> }
  | { ok: false; reason: FillSkeletonFailureReason; token?: string; detail?: string }

const OPEN_TAG_PATTERN = /<<<([A-Z][A-Z0-9_]*)>>>/g
const PLACEHOLDER_PATTERN = /\{\{(@?[A-Z][A-Z0-9_]*)\}\}/g
/** Models often emit <<</TOKEN>> (2 closers) instead of <<</TOKEN>>> (3). */
const ANY_CLOSE_TAG = /<<<\/([A-Z][A-Z0-9_]*)>{2,3}/g
const CLOSE_TAG_ONLY = /<<<\/[A-Z][A-Z0-9_]*>{2,3}/g

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

export function listSkeletonPlaceholders(skeleton: string): string[] {
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
  return body
    .replace(/^\r?\n/, '')
    .replace(/\r?\n$/, '')
    .replace(new RegExp(`^(?:${CLOSE_TAG_ONLY.source})\\s*`, 'g'), '')
    .replace(new RegExp(`\\s*(?:${CLOSE_TAG_ONLY.source})$`, 'g'), '')
    .trim()
}

function leadingJsonStructureStart(trimmed: string): number {
  const arrayStart = trimmed.indexOf('[')
  const objectStart = trimmed.indexOf('{')
  if (arrayStart >= 0 && (objectStart < 0 || arrayStart < objectStart)) {
    return arrayStart
  }
  if (objectStart >= 0) {
    return objectStart
  }
  return -1
}

type JsonScanState = { depth: number; inString: boolean; escaped: boolean }

function advanceJsonScanState(state: JsonScanState, char: string, opener: string, closer: string): number | undefined {
  if (state.inString) {
    if (state.escaped) {
      state.escaped = false
    } else if (char === '\\') {
      state.escaped = true
    } else if (char === '"') {
      state.inString = false
    }
    return undefined
  }
  if (char === '"') {
    state.inString = true
    return undefined
  }
  if (char === opener) {
    state.depth += 1
    return undefined
  }
  if (char === closer) {
    state.depth -= 1
    if (state.depth === 0) {
      return 0
    }
  }
  return undefined
}

/** Trim a leading `[…]` / `{…}` slice at the first balanced closer (ignores strings). */
function scanBalancedJsonSlice(slice: string): string | undefined {
  const opener = slice[0]!
  const closer = opener === '[' ? ']' : '}'
  const state: JsonScanState = { depth: 0, inString: false, escaped: false }
  for (let index = 0; index < slice.length; index += 1) {
    if (advanceJsonScanState(state, slice[index]!, opener, closer) === 0) {
      return slice.slice(0, index + 1)
    }
  }
  return undefined
}

function coerceLeadingJsonStructure(trimmed: string): string | undefined {
  const start = leadingJsonStructureStart(trimmed)
  if (start < 0 || start > 8) {
    return undefined
  }
  const slice = trimmed.slice(start)
  try {
    JSON.parse(slice)
    return slice
  } catch {
    return scanBalancedJsonSlice(slice)
  }
}

/** For {{@TOKEN}} inserts: keep a leading JSON array/object/literal; drop trailing prose/tags. */
function coerceRawJsonFragment(body: string): string {
  const trimmed = trimBlockBody(body)
  const structured = coerceLeadingJsonStructure(trimmed)
  if (structured !== undefined) {
    return structured
  }
  const literal = trimmed.match(/^(true|false|null|-?\d+(?:\.\d+)?)/)
  if (literal) {
    return literal[1]!
  }
  return trimmed
}

type BlockEnd =
  | ExtractBlocksResult
  | { endAt: number; resumeAt: number }

function resolveCloseBeforeOpen(
  token: string,
  nextClose: RegExpExecArray,
  lenient: boolean
): BlockEnd {
  const closeAt = nextClose.index
  const resumeAt = closeAt + nextClose[0].length
  if (nextClose[1] === token) {
    return { endAt: closeAt, resumeAt }
  }
  if (!lenient) {
    return {
      ok: false,
      reason: 'malformed_tag',
      token,
      detail: `expected <<</${token}>>>, found <<</${nextClose[1]}>>>`
    }
  }
  return { endAt: closeAt, resumeAt }
}

function findNextOpenAndClose(
  raw: string,
  contentStart: number
): { nextOpen: RegExpExecArray | null; nextClose: RegExpExecArray | null } {
  OPEN_TAG_PATTERN.lastIndex = contentStart
  ANY_CLOSE_TAG.lastIndex = contentStart
  return {
    nextOpen: OPEN_TAG_PATTERN.exec(raw),
    nextClose: ANY_CLOSE_TAG.exec(raw)
  }
}

function eofBlockEnd(raw: string, token: string, lenient: boolean): BlockEnd {
  return lenient
    ? { endAt: raw.length, resumeAt: raw.length }
    : { ok: false, reason: 'unclosed_tag', token }
}

/**
 * End a labeled block at the matching close, the next open (implicit close),
 * a mismatched close when lenient (orphan skipped), or EOF when lenient
 * (models often omit closing tags).
 */
function resolveBlockEnd(
  raw: string,
  token: string,
  contentStart: number,
  lenient: boolean
): BlockEnd {
  const { nextOpen, nextClose } = findNextOpenAndClose(raw, contentStart)
  if (!nextOpen && !nextClose) {
    return eofBlockEnd(raw, token, lenient)
  }
  const openAt = nextOpen?.index ?? Number.POSITIVE_INFINITY
  const closeAt = nextClose?.index ?? Number.POSITIVE_INFINITY
  if (closeAt < openAt && nextClose) {
    return resolveCloseBeforeOpen(token, nextClose, lenient)
  }
  if (nextOpen) {
    return { endAt: openAt, resumeAt: openAt }
  }
  return { ok: false, reason: 'unclosed_tag', token }
}

export type ExtractLabeledBlocksOptions = {
  allowedTokens?: readonly string[]
  /** When true, next open, orphan close, or EOF ends the current block (model drift). */
  lenient?: boolean
}

/**
 * When the model reuses REGION_0_NAME for the second region, remap to the next
 * free PREFIX_N_SUFFIX slot (REGION_1_NAME, FOE_1_*, …).
 */
function remapDuplicateIndexedToken(
  token: string,
  values: Record<string, string>,
  allowed: ReadonlySet<string> | undefined
): string | undefined {
  const matched = /^([A-Z]+)_(\d+)_(.+)$/.exec(token)
  if (!matched) {
    return undefined
  }
  const prefix = matched[1]!
  const suffix = matched[3]!
  let index = Number(matched[2]) + 1
  for (let guard = 0; guard < 64; guard += 1) {
    const candidate = `${prefix}_${index}_${suffix}`
    if (allowed && !allowed.has(candidate)) {
      return undefined
    }
    if (!(candidate in values)) {
      if (!allowed || allowed.has(candidate)) {
        return candidate
      }
    }
    index += 1
  }
  return undefined
}

type TokenStoreResolution =
  | { ok: true; token: string }
  | { ok: false; reason: FillSkeletonFailureReason; token?: string; detail?: string }

function resolveTokenForStore(
  token: string,
  values: Record<string, string>,
  allowed: ReadonlySet<string> | undefined,
  lenient: boolean
): TokenStoreResolution {
  if (!(token in values)) {
    return { ok: true, token }
  }
  if (!lenient) {
    return { ok: false, reason: 'duplicate_token', token }
  }
  const remapped = remapDuplicateIndexedToken(token, values, allowed)
  if (!remapped) {
    return { ok: false, reason: 'duplicate_token', token }
  }
  return { ok: true, token: remapped }
}

type ExtractCursor = { cursor: number } | ExtractBlocksResult

type LabeledExtractContext = {
  values: Record<string, string>
  allowed: ReadonlySet<string> | undefined
  lenient: boolean
}

function assignBodyOrRemap(
  token: string,
  body: string,
  ctx: LabeledExtractContext,
  resumeAt: number
): ExtractCursor {
  if (!(token in ctx.values) || !ctx.values[token]!.trim()) {
    ctx.values[token] = body
    return { cursor: resumeAt }
  }
  const stored = resolveTokenForStore(token, ctx.values, ctx.allowed, ctx.lenient)
  if (!stored.ok) {
    // Lenient: keep the first non-empty value; skip unremappable duplicates.
    return ctx.lenient ? { cursor: resumeAt } : stored
  }
  if (ctx.values[stored.token]?.trim()) {
    return { cursor: resumeAt }
  }
  ctx.values[stored.token] = body
  return { cursor: resumeAt }
}

function storeLabeledBlockMatch(
  raw: string,
  match: RegExpExecArray,
  ctx: LabeledExtractContext
): ExtractCursor {
  const contentStart = match.index + match[0].length
  const resolved = resolveBlockEnd(raw, match[1], contentStart, ctx.lenient)
  if (!('endAt' in resolved)) {
    return resolved
  }
  const token = match[1]
  if (ctx.allowed && !ctx.allowed.has(token)) {
    return { cursor: resolved.resumeAt }
  }
  const body = trimBlockBody(raw.slice(contentStart, resolved.endAt))
  // Empty tags (common after a full region grid) must not steal the next index.
  if (!body) {
    return { cursor: resolved.resumeAt }
  }
  return assignBodyOrRemap(token, body, ctx, resolved.resumeAt)
}

/**
 * Extract <<<TOKEN>>>…<<</TOKEN>>> blocks from raw model text.
 * Ignores surrounding prose; fails on unclosed or duplicate (allowed) tags.
 * When `allowedTokens` is set, tags not in that list are skipped.
 * Lenient mode remaps duplicate PREFIX_N_FIELD tags to the next free index.
 */
export function extractLabeledBlocks(
  raw: string,
  options?: ExtractLabeledBlocksOptions
): ExtractBlocksResult {
  const ctx: LabeledExtractContext = {
    values: {},
    allowed: options?.allowedTokens ? new Set(options.allowedTokens) : undefined,
    lenient: options?.lenient ?? false
  }
  OPEN_TAG_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  let cursor = 0
  while ((match = OPEN_TAG_PATTERN.exec(raw)) !== null) {
    if (match.index < cursor) {
      continue
    }
    const step = storeLabeledBlockMatch(raw, match, ctx)
    if ('ok' in step) {
      return step
    }
    cursor = step.cursor
    OPEN_TAG_PATTERN.lastIndex = cursor
  }
  return { ok: true, values: ctx.values }
}

function stripLeadingCloseTags(body: string): string {
  return body.replace(/^(?:<<<\/[A-Z][A-Z0-9_]*>{2,3}\s*)+/g, '').trim()
}

function isShortLabelBody(body: string): boolean {
  return body.length > 0 && body.length <= 80 && !body.includes('\n')
}

/** Prefer short single-line labels when the model dumps prose under the wrong header first. */
function preferSectionBody(existing: string | undefined, next: string): string {
  const cleaned = stripLeadingCloseTags(next)
  if (!existing) {
    return cleaned
  }
  if (!cleaned) {
    return existing
  }
  const existingShort = isShortLabelBody(existing)
  const nextShort = isShortLabelBody(cleaned)
  if (nextShort && !existingShort) {
    return cleaned
  }
  return existing
}

/**
 * Models often echo skeleton placeholders as section headers:
 *   {{WORLD_NAME}}
 *   Mistmarsh
 *   {{WORLD_SUMMARY}}
 *   …
 * Retrieve those strings (allowed tokens only).
 */
export function extractPlaceholderHeaderSections(
  raw: string,
  allowedTokens: readonly string[]
): Record<string, string> {
  const allowed = new Set(allowedTokens)
  const values: Record<string, string> = {}
  const headerRe = /\{\{(@?[A-Z][A-Z0-9_]*)\}\}/g
  const headers: Array<{ token: string; contentStart: number; headerAt: number }> = []
  let match: RegExpExecArray | null
  while ((match = headerRe.exec(raw)) !== null) {
    const token = match[1].startsWith('@') ? match[1].slice(1) : match[1]
    if (!allowed.has(token)) {
      continue
    }
    headers.push({
      token,
      headerAt: match.index,
      contentStart: match.index + match[0].length
    })
  }
  for (let index = 0; index < headers.length; index += 1) {
    const current = headers[index]!
    const endAt = index + 1 < headers.length ? headers[index + 1]!.headerAt : raw.length
    const body = trimBlockBody(raw.slice(current.contentStart, endAt))
    values[current.token] = preferSectionBody(values[current.token], body)
  }
  return values
}

/**
 * Retrieve placeholder strings from raw LLM text, then ready for engine skeleton load.
 * Accepts <<<TOKEN>>> blocks (lenient) and {{TOKEN}} section headers.
 */
export function retrieveSkeletonFillValues(
  raw: string,
  placeholders: readonly string[]
): Record<string, string> | undefined {
  const values = collectSkeletonFillValues(raw, placeholders)
  for (const token of placeholders) {
    if (!(token in values) || !values[token]!.trim()) {
      return undefined
    }
  }
  const cleaned: Record<string, string> = {}
  for (const token of placeholders) {
    cleaned[token] = values[token]!
  }
  return cleaned
}

const MIN_ORPHAN_PROSE_CHARS = 40
/** Opens, closes with 2–3 `>`, and {{TOKEN}} / {{@TOKEN}} headers. */
const TAG_OR_HEADER_PATTERN = /<<<\/?([A-Z][A-Z0-9_]*)>{2,3}|\{\{(@?[A-Z][A-Z0-9_]*)\}\}/g

type OrphanScanState = {
  lastIndex: number
  insideOpenBlock: boolean
  orphanChunks: string[]
  values: Record<string, string>
  allowed: ReadonlySet<string>
}

function claimLooseProseAtMatch(
  raw: string,
  state: OrphanScanState,
  match: RegExpExecArray
): void {
  if (state.insideOpenBlock) {
    return
  }
  const isClose = match[0].startsWith('<<</')
  const token = (match[1] ?? match[2] ?? '').replace(/^@/, '')
  const loose = trimBlockBody(raw.slice(state.lastIndex, match.index))
  if (loose.length < MIN_ORPHAN_PROSE_CHARS) {
    return
  }
  if (isClose && state.allowed.has(token) && !(state.values[token]?.trim())) {
    state.values[token] = loose
    return
  }
  state.orphanChunks.push(loose)
}

function collectOrphanProseChunks(
  raw: string,
  values: Record<string, string>,
  allowed: ReadonlySet<string>
): string[] {
  const state: OrphanScanState = {
    lastIndex: 0,
    insideOpenBlock: false,
    orphanChunks: [],
    values,
    allowed
  }
  TAG_OR_HEADER_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TAG_OR_HEADER_PATTERN.exec(raw)) !== null) {
    claimLooseProseAtMatch(raw, state, match)
    state.insideOpenBlock = !match[0].startsWith('<<</')
    state.lastIndex = match.index + match[0].length
  }
  if (!state.insideOpenBlock) {
    const trailing = trimBlockBody(raw.slice(state.lastIndex))
    if (trailing.length >= MIN_ORPHAN_PROSE_CHARS) {
      state.orphanChunks.push(trailing)
    }
  }
  return state.orphanChunks
}

function assignOrphanChunksToMissing(
  placeholders: readonly string[],
  values: Record<string, string>,
  orphanChunks: string[]
): void {
  const missing = placeholders.filter((token) => !(values[token]?.trim()))
  if (missing.length === 0 || orphanChunks.length === 0) {
    return
  }
  const take = orphanChunks.slice(-missing.length)
  for (let index = 0; index < missing.length; index += 1) {
    const chunk = take[index]
    if (chunk) {
      values[missing[index]!] = chunk
    }
  }
}

/**
 * Collect loose prose outside active open blocks. Orphan closes
 * (`<<</WORLD_SUMMARY>>>` without a matching open) claim the preceding loose prose.
 * Remaining orphan chunks fill missing placeholders (last N chunks → N missing tokens).
 */
function applyOrphanProseToMissingValues(
  raw: string,
  placeholders: readonly string[],
  values: Record<string, string>
): void {
  const orphanChunks = collectOrphanProseChunks(raw, values, new Set(placeholders))
  assignOrphanChunksToMissing(placeholders, values, orphanChunks)
}

function collectSkeletonFillValues(
  raw: string,
  placeholders: readonly string[]
): Record<string, string> {
  const values: Record<string, string> = {}
  const allowedTokens = [...placeholders, ...extraRetrieveTokensForPlaceholders(placeholders)]
  const labeled = extractLabeledBlocks(raw, {
    allowedTokens,
    lenient: true
  })
  if (labeled.ok) {
    for (const [token, body] of Object.entries(labeled.values)) {
      values[canonicalizeRetrievedToken(token)] = body
    }
  }
  const fromHeaders = extractPlaceholderHeaderSections(raw, allowedTokens)
  for (const [token, body] of Object.entries(fromHeaders)) {
    const canonical = canonicalizeRetrievedToken(token)
    values[canonical] = preferSectionBody(values[canonical], body)
  }
  applyOrphanProseToMissingValues(raw, placeholders, values)
  splitOverflowNameBodiesIntoDescriptions(values, placeholders)
  expandRegionPotentialQuests(values, placeholders)
  return values
}

/**
 * Models often stuff description under REGION_N_NAME. First line stays the name;
 * remaining paragraphs fill REGION_N_DESCRIPTION when that token is missing.
 */
function splitOverflowNameBodiesIntoDescriptions(
  values: Record<string, string>,
  placeholders: readonly string[]
): void {
  for (const token of placeholders) {
    const nameMatch = /^(REGION_\d+)_NAME$/.exec(token)
    if (!nameMatch) {
      continue
    }
    const descriptionToken = `${nameMatch[1]}_DESCRIPTION`
    if (!placeholders.includes(descriptionToken) || values[descriptionToken]?.trim()) {
      continue
    }
    const body = values[token]
    if (!body) {
      continue
    }
    const lines = body.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0)
    if (lines.length < 2) {
      continue
    }
    values[token] = lines[0]!
    values[descriptionToken] = lines.slice(1).join('\n\n')
  }
}

/** Live models emit REGION_N_POTENTIAL_QUESTS or HISTORY_BACKSTORIY typos. */
function extraRetrieveTokensForPlaceholders(placeholders: readonly string[]): string[] {
  const extra: string[] = []
  for (const token of placeholders) {
    const quest = /^(REGION_\d+)_QUEST_0$/.exec(token)
    if (quest) {
      extra.push(`${quest[1]}_POTENTIAL_QUESTS`)
    }
    const history = /^(REGION_\d+)_HISTORY_BACKSTORY$/.exec(token)
    if (history) {
      extra.push(`${history[1]}_HISTORY_BACKSTORIY`)
    }
  }
  return extra
}

function canonicalizeRetrievedToken(token: string): string {
  return token.replace(/_HISTORY_BACKSTORIY$/, '_HISTORY_BACKSTORY')
}

function splitPotentialQuestLines(body: string): string[] {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter((line) => line.length > 0)
  if (lines.length >= 2) {
    return lines
  }
  const bySentence = body
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  return bySentence.length >= 2 ? bySentence : lines
}

function fillQuestSlotIfMissing(
  values: Record<string, string>,
  placeholders: readonly string[],
  token: string,
  line: string | undefined
): void {
  if (line && placeholders.includes(token) && !values[token]?.trim()) {
    values[token] = line
  }
}

function expandOneCompositePotentialQuests(
  values: Record<string, string>,
  placeholders: readonly string[],
  composite: string
): void {
  const prefix = composite.replace(/_POTENTIAL_QUESTS$/, '')
  const lines = splitPotentialQuestLines(values[composite] ?? '')
  fillQuestSlotIfMissing(values, placeholders, `${prefix}_QUEST_0`, lines[0])
  fillQuestSlotIfMissing(values, placeholders, `${prefix}_QUEST_1`, lines[1])
}

function expandCompositePotentialQuests(
  values: Record<string, string>,
  placeholders: readonly string[]
): void {
  const compositeKeys = Object.keys(values).filter((token) =>
    /^(REGION_\d+)_POTENTIAL_QUESTS$/.test(token)
  )
  for (const composite of compositeKeys) {
    expandOneCompositePotentialQuests(values, placeholders, composite)
  }
}

function fillMissingRegionQuestDefaults(
  values: Record<string, string>,
  placeholders: readonly string[]
): void {
  for (const token of placeholders) {
    if (!/^(REGION_\d+)_QUEST_[01]$/.test(token) || values[token]?.trim()) {
      continue
    }
    values[token] = token.endsWith('_QUEST_0')
      ? 'Investigate a local threat tied to this region.'
      : 'Protect a community landmark or convoy in this region.'
  }
}

function expandRegionPotentialQuests(
  values: Record<string, string>,
  placeholders: readonly string[]
): void {
  expandCompositePotentialQuests(values, placeholders)
  fillMissingRegionQuestDefaults(values, placeholders)
}

/**
 * Substitute placeholders using an already-retrieved token→string map.
 * Engine-owned path: retrieve strings from the model, then load them here.
 */
export function fillSkeletonFromValues(
  skeleton: string,
  values: Record<string, string>
): FillSkeletonResult {
  const placeholders = listSkeletonPlaceholders(skeleton)
  for (const token of placeholders) {
    if (!(token in values)) {
      return { ok: false, reason: 'missing_token', token }
    }
  }
  let jsonText = skeleton
  for (const token of placeholders) {
    const rawValue = values[token]
    if (isRawPlaceholder(skeleton, token)) {
      jsonText = jsonText.split(`{{@${token}}}`).join(coerceRawJsonFragment(rawValue))
    } else {
      jsonText = jsonText.split(`{{${token}}}`).join(escapeJsonStringContent(trimBlockBody(rawValue)))
    }
  }
  return { ok: true, jsonText, values }
}

/**
 * Retrieve strings from raw LLM text (labeled blocks and/or {{TOKEN}} headers),
 * then load them into the engine-authored JSON skeleton.
 */
export function fillSkeleton(skeleton: string, rawLlmText: string): FillSkeletonResult {
  const placeholders = listSkeletonPlaceholders(skeleton)
  const values = collectSkeletonFillValues(rawLlmText, placeholders)
  for (const token of placeholders) {
    if (!(token in values) || !values[token]!.trim()) {
      return { ok: false, reason: 'missing_token', token }
    }
  }
  return fillSkeletonFromValues(skeleton, values)
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
  'The engine owns the JSON structure below. For each {{NAME}} or {{@NAME}} in the skeleton, emit one labeled block using that exact NAME:',
  '<<<YOUR_PLACEHOLDER>>>',
  'the value for that field',
  '<<</YOUR_PLACEHOLDER>>>',
  'Replace YOUR_PLACEHOLDER with each exact placeholder name from the skeleton (for example PANTHEON_SUMMARY or DEITY_0_NAME). Never emit a literal tag named TOKEN or YOUR_PLACEHOLDER.',
  'One block per skeleton placeholder. Brief prose outside tags is OK.',
  'Close each tag before opening the next — do not nest field tags inside another field.',
  'Put all quotes, commas, and newlines inside the block body — the engine escapes them.',
  'Tokens written as {{@NAME}} expect a raw JSON fragment (array, object, or boolean) inside the block — not a quoted string.'
].join('\n')
