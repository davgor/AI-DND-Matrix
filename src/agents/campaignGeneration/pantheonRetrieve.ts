/**
 * Pantheon string retrieve → engine skeleton fill (ticket 165).
 * Models return deity strings in loose labeled forms; we map them into the
 * engine-owned pantheon JSON skeleton ourselves.
 */

import {
  extractLabeledBlocks,
  fillSkeletonFromValues,
  type FillSkeletonResult
} from '../skeletonFill'
import {
  buildPantheonSkeletonJson,
  PANTHEON_SKELETON_DEITY_COUNT
} from './pantheonSkeleton'

const DEITY_FIELDS = ['NAME', 'EPITHET', 'DOMAINS', 'TENETS', 'BLURB'] as const
type DeityField = (typeof DEITY_FIELDS)[number]

const FIELD_LINE_PATTERN =
  /^(name|epithet|domains|domain|tenets|tenet|blurb|description)\s*:\s*(.*)$/i

function pantheonFieldTokens(): string[] {
  const tokens = ['PANTHEON_SUMMARY']
  for (let index = 0; index < PANTHEON_SKELETON_DEITY_COUNT; index += 1) {
    for (const field of DEITY_FIELDS) {
      tokens.push(`DEITY_${index}_${field}`)
    }
  }
  return tokens
}

function pantheonCompositeTokens(): string[] {
  const tokens: string[] = []
  for (let index = 0; index < PANTHEON_SKELETON_DEITY_COUNT; index += 1) {
    tokens.push(`DEITY_${index}`)
  }
  return tokens
}

function fieldToken(index: number, field: DeityField): string {
  return `DEITY_${index}_${field}`
}

function deityFieldsComplete(values: Record<string, string>, index: number): boolean {
  return DEITY_FIELDS.every((field) => fieldToken(index, field) in values)
}

function mapLineKeyToField(key: string): DeityField | undefined {
  const lowered = key.trim().toLowerCase()
  if (lowered === 'name') return 'NAME'
  if (lowered === 'epithet') return 'EPITHET'
  if (lowered === 'domains' || lowered === 'domain') return 'DOMAINS'
  if (lowered === 'tenets' || lowered === 'tenet') return 'TENETS'
  if (lowered === 'blurb' || lowered === 'description') return 'BLURB'
  return undefined
}

type DeityLineParseState = {
  unlabeledName?: string
  unlabeledEpithet?: string
  current?: DeityField
  chunks: Partial<Record<DeityField, string[]>>
}

function pushDeityChunk(state: DeityLineParseState, field: DeityField, text: string): void {
  const list = state.chunks[field] ?? []
  list.push(text)
  state.chunks[field] = list
}

function ingestLabeledDeityLine(state: DeityLineParseState, line: string): boolean {
  const labeled = FIELD_LINE_PATTERN.exec(line)
  if (!labeled) {
    return false
  }
  const field = mapLineKeyToField(labeled[1])
  if (!field) {
    return true
  }
  state.current = field
  pushDeityChunk(state, field, labeled[2].trim())
  return true
}

function ingestUnlabeledDeityLine(state: DeityLineParseState, line: string): void {
  if (state.current) {
    pushDeityChunk(state, state.current, line)
    return
  }
  if (state.unlabeledName === undefined) {
    state.unlabeledName = line
    return
  }
  if (state.unlabeledEpithet === undefined) {
    state.unlabeledEpithet = line
  }
}

function finalizeDeityFields(state: DeityLineParseState): Partial<Record<DeityField, string>> {
  const fields: Partial<Record<DeityField, string>> = {}
  for (const field of DEITY_FIELDS) {
    const parts = state.chunks[field]
    if (parts && parts.length > 0) {
      fields[field] = parts.join('\n').trim()
    }
  }
  if (fields.NAME === undefined && state.unlabeledName !== undefined) {
    fields.NAME = state.unlabeledName
  }
  if (fields.EPITHET === undefined && state.unlabeledEpithet !== undefined) {
    fields.EPITHET = state.unlabeledEpithet
  }
  if (fields.EPITHET === undefined) {
    fields.EPITHET = ''
  }
  return fields
}

/** Parse `name: …` / `Epithet: …` lines (and unlabeled first-line name) from a deity body. */
function parseDeityFieldLines(body: string): Partial<Record<DeityField, string>> {
  const state: DeityLineParseState = { chunks: {} }
  for (const line of body.split(/\r?\n/).map((entry) => entry.trim())) {
    if (!line) {
      continue
    }
    if (!ingestLabeledDeityLine(state, line)) {
      ingestUnlabeledDeityLine(state, line)
    }
  }
  return finalizeDeityFields(state)
}

function mergeDeityFields(
  values: Record<string, string>,
  index: number,
  fields: Partial<Record<DeityField, string>>
): void {
  for (const field of DEITY_FIELDS) {
    const token = fieldToken(index, field)
    if (token in values) {
      continue
    }
    const value = fields[field]
    if (value !== undefined) {
      values[token] = value
    }
  }
}

function expandIncompleteDeitySlot(values: Record<string, string>, index: number): void {
  if (deityFieldsComplete(values, index)) {
    return
  }
  const composite = values[`DEITY_${index}`]
  if (composite !== undefined) {
    mergeDeityFields(values, index, parseDeityFieldLines(composite))
    delete values[`DEITY_${index}`]
    return
  }
  const nameBody = values[fieldToken(index, 'NAME')]
  if (nameBody === undefined || deityFieldsComplete(values, index)) {
    return
  }
  const parsed = parseDeityFieldLines(nameBody)
  if (parsed.NAME !== undefined) {
    values[fieldToken(index, 'NAME')] = parsed.NAME
  }
  mergeDeityFields(values, index, parsed)
}

/**
 * Retrieve pantheon placeholder strings from raw LLM text.
 * Accepts composite <<<DEITY_N>>> blocks, per-field blocks, and collapsed NAME dumps.
 */
export function retrievePantheonFillValues(raw: string): Record<string, string> | undefined {
  const fieldTokens = pantheonFieldTokens()
  const compositeTokens = pantheonCompositeTokens()
  const extracted = extractLabeledBlocks(raw, {
    allowedTokens: [...fieldTokens, ...compositeTokens],
    lenient: true
  })
  if (!extracted.ok) {
    return undefined
  }
  const values: Record<string, string> = { ...extracted.values }
  for (let index = 0; index < PANTHEON_SKELETON_DEITY_COUNT; index += 1) {
    expandIncompleteDeitySlot(values, index)
  }
  for (const token of fieldTokens) {
    if (!(token in values)) {
      return undefined
    }
  }
  const cleaned: Record<string, string> = {}
  for (const token of fieldTokens) {
    cleaned[token] = values[token]
  }
  return cleaned
}

/** Retrieve pantheon strings from raw LLM text, then load them into the engine skeleton. */
export function fillPantheonSkeleton(raw: string): FillSkeletonResult {
  const values = retrievePantheonFillValues(raw)
  if (!values) {
    return { ok: false, reason: 'missing_token', token: 'PANTHEON_SUMMARY' }
  }
  return fillSkeletonFromValues(buildPantheonSkeletonJson(), values)
}
