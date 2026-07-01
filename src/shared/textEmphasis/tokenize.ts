import type { EmphasisToken } from './types'

/**
 * v1: Nested emphasis is not supported. Inside an outer span, inner marker
 * characters are treated as literal text until the outer span closes.
 */
const OPENERS = [
  { open: '**', close: '**', type: 'strong' as const },
  { open: '__', close: '__', type: 'strong' as const },
  { open: '""', close: '""', type: 'em' as const },
  { open: "''", close: "''", type: 'em' as const },
  { open: '*', close: '*', type: 'em' as const },
  { open: '_', close: '_', type: 'em' as const }
]

function isEscapable(character: string): boolean {
  return character === '*' || character === '_' || character === '"' || character === "'" || character === '\\'
}

function matchesAt(input: string, index: number, marker: string): boolean {
  return input.startsWith(marker, index)
}

function readLiteralUntil(
  input: string,
  start: number,
  close: string,
  end: number
): { content: string; next: number; closed: boolean } {
  let content = ''
  let index = start
  while (index < end) {
    if (input[index] === '\\' && index + 1 < end && isEscapable(input[index + 1])) {
      content += input[index + 1]
      index += 2
      continue
    }
    if (matchesAt(input, index, close)) {
      return { content, next: index, closed: true }
    }
    content += input[index]
    index += 1
  }
  return { content: '', next: start, closed: false }
}

function isWordCharacter(character: string): boolean {
  return /[A-Za-z0-9_]/.test(character)
}

function isSingleQuoteOpener(input: string, index: number): boolean {
  const quote = input[index]
  if (quote !== '"' && quote !== "'") {
    return false
  }
  if (index + 1 < input.length && input[index + 1] === quote) {
    return false
  }
  return !(index > 0 && isWordCharacter(input[index - 1]!))
}

function readSingleQuotedEmphasis(
  input: string,
  index: number,
  end: number,
  quote: string
): { content: string; next: number } | null {
  let content = ''
  let cursor = index + 1
  while (cursor < end) {
    const character = input[cursor]!
    if (character === '\\' && cursor + 1 < end && input[cursor + 1] === quote) {
      content += quote
      cursor += 2
      continue
    }
    if (character !== quote) {
      content += character
      cursor += 1
      continue
    }
    if (cursor + 1 < end && input[cursor + 1] === quote) {
      content += character
      cursor += 1
      continue
    }
    if (content.length === 0) {
      return null
    }
    return { content, next: cursor + 1 }
  }
  return null
}

function trySingleQuoteEmphasis(
  input: string,
  index: number,
  end: number
): { type: 'em'; content: string; next: number } | null {
  if (!isSingleQuoteOpener(input, index)) {
    return null
  }
  const quote = input[index]!
  const span = readSingleQuotedEmphasis(input, index, end, quote)
  return span ? { type: 'em', content: span.content, next: span.next } : null
}

function tryEmphasisSpan(
  input: string,
  index: number,
  end: number
): { type: 'em' | 'strong'; content: string; next: number } | null {
  for (const opener of OPENERS) {
    if (!matchesAt(input, index, opener.open)) {
      continue
    }
    const innerStart = index + opener.open.length
    const literal = readLiteralUntil(input, innerStart, opener.close, end)
    if (!literal.closed) {
      continue
    }
    return {
      type: opener.type,
      content: literal.content,
      next: literal.next + opener.close.length
    }
  }
  return trySingleQuoteEmphasis(input, index, end)
}

export function tokenizeTextEmphasis(input: string): EmphasisToken[] {
  const tokens: EmphasisToken[] = []
  let textBuffer = ''
  let index = 0
  const end = input.length

  const flushText = (): void => {
    if (textBuffer.length > 0) {
      tokens.push({ type: 'text', content: textBuffer })
      textBuffer = ''
    }
  }

  while (index < end) {
    if (input[index] === '\\' && index + 1 < end && isEscapable(input[index + 1])) {
      textBuffer += input[index + 1]
      index += 2
      continue
    }
    const span = tryEmphasisSpan(input, index, end)
    if (span) {
      flushText()
      tokens.push({ type: span.type, content: span.content })
      index = span.next
      continue
    }
    textBuffer += input[index]
    index += 1
  }

  flushText()
  return tokens
}
