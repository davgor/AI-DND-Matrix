import type { EmphasisToken } from './types'

const CHAT_EMPHASIS_OPENERS = ['**', '__', '""', "''", '*', '_', '"', "'"] as const

function matchesAt(input: string, index: number, marker: string): boolean {
  return input.startsWith(marker, index)
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

function wouldStartAlternateChatDelimiter(
  input: string,
  index: number,
  activeOpener: { open: string; close: string }
): boolean {
  if (matchesAt(input, index, activeOpener.close)) {
    return false
  }
  for (const opener of CHAT_EMPHASIS_OPENERS) {
    if (opener === activeOpener.open) {
      continue
    }
    if (matchesAt(input, index, opener)) {
      if ((opener === '"' || opener === "'") && !isSingleQuoteOpener(input, index)) {
        continue
      }
      return true
    }
  }
  return false
}

function readChatSpanContent(
  input: string,
  start: number,
  opener: { open: string; close: string },
  end: number
): { content: string; next: number; closed: boolean; interruptedBy?: string } | null {
  let content = ''
  let index = start
  while (index < end) {
    const character = input[index]!
    if (character === '\n') {
      if (content.length === 0) {
        return null
      }
      return { content, next: index, closed: false }
    }
    if (matchesAt(input, index, opener.close)) {
      return { content, next: index, closed: true }
    }
    if (wouldStartAlternateChatDelimiter(input, index, opener)) {
      if (content.length === 0) {
        return null
      }
      const interruptedBy = CHAT_EMPHASIS_OPENERS.find((marker) => matchesAt(input, index, marker)) ?? character
      return { content, next: index, closed: false, interruptedBy }
    }
    content += character
    index += 1
  }
  if (content.length === 0) {
    return null
  }
  return { content, next: index, closed: false }
}

function consumeLiteralDelimiterRun(
  input: string,
  index: number,
  end: number,
  delimiter: string
): { text: string; next: number } {
  const start = index
  let cursor = index + delimiter.length
  while (cursor < end) {
    if (matchesAt(input, cursor, delimiter)) {
      return { text: input.slice(start, cursor + delimiter.length), next: cursor + delimiter.length }
    }
    cursor += 1
  }
  return { text: input.slice(start, end), next: end }
}

function tryChatSingleQuoteEmphasis(
  input: string,
  index: number,
  end: number
): { type: 'em'; content: string; next: number; interruptedBy?: string } | null {
  const quote = input[index]
  if (!isSingleQuoteOpener(input, index)) {
    return null
  }

  const span = readChatSpanContent(input, index + 1, { open: quote, close: quote }, end)
  if (!span) {
    return null
  }
  if (!span.closed) {
    return { type: 'em', content: span.content, next: span.next, interruptedBy: span.interruptedBy }
  }
  if (span.content.length === 0) {
    return null
  }
  return { type: 'em', content: span.content, next: span.next + 1 }
}

function tryChatEmphasisSpan(
  input: string,
  index: number,
  end: number
): { type: 'em' | 'strong'; content: string; next: number; interruptedBy?: string } | null {
  for (const opener of [
    { open: '**', close: '**', type: 'strong' as const },
    { open: '__', close: '__', type: 'strong' as const },
    { open: '""', close: '""', type: 'em' as const },
    { open: "''", close: "''", type: 'em' as const },
    { open: '*', close: '*', type: 'em' as const },
    { open: '_', close: '_', type: 'em' as const }
  ]) {
    if (!matchesAt(input, index, opener.open)) {
      continue
    }
    const span = readChatSpanContent(input, index + opener.open.length, opener, end)
    if (!span) {
      continue
    }
    if (!span.closed && span.content.length === 0) {
      continue
    }
    return {
      type: opener.type,
      content: span.content,
      next: span.closed ? span.next + opener.close.length : span.next,
      interruptedBy: span.closed ? undefined : span.interruptedBy
    }
  }
  return tryChatSingleQuoteEmphasis(input, index, end)
}

export function tokenizeChatMessage(input: string): EmphasisToken[] {
  const tokens: EmphasisToken[] = []
  let textBuffer = ''
  let index = 0
  const end = input.length
  let pendingLiteralDelimiter: string | null = null

  const flushText = (): void => {
    if (textBuffer.length > 0) {
      tokens.push({ type: 'text', content: textBuffer })
      textBuffer = ''
    }
  }

  while (index < end) {
    if (pendingLiteralDelimiter) {
      const literal = consumeLiteralDelimiterRun(input, index, end, pendingLiteralDelimiter)
      textBuffer += literal.text
      index = literal.next
      pendingLiteralDelimiter = null
      continue
    }

    const span = tryChatEmphasisSpan(input, index, end)
    if (span) {
      flushText()
      tokens.push({ type: span.type, content: span.content })
      index = span.next
      if (span.interruptedBy) {
        pendingLiteralDelimiter = span.interruptedBy
      }
      continue
    }
    textBuffer += input[index]!
    index += 1
  }

  flushText()
  return tokens
}

function isEmphasisToken(token: EmphasisToken | undefined): boolean {
  return token?.type === 'em' || token?.type === 'strong'
}

function normalizeAdjacentTextToken(
  text: string,
  previous: EmphasisToken | undefined,
  next: EmphasisToken | undefined
): string | null {
  let normalizedText = text.replace(/\n{2,}/g, '\n')
  if (isEmphasisToken(previous)) {
    normalizedText = normalizedText.replace(/^\n+/, '')
  }
  if (isEmphasisToken(next)) {
    normalizedText = normalizedText.replace(/\n+$/, '')
  }
  if (normalizedText.trim().length === 0 && isEmphasisToken(previous) && isEmphasisToken(next)) {
    return null
  }
  return normalizedText.length > 0 ? normalizedText : null
}

export function normalizeChatMessageTokens(tokens: EmphasisToken[]): EmphasisToken[] {
  const normalized: EmphasisToken[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!
    if (token.type !== 'text') {
      normalized.push(token)
      continue
    }

    const previous = normalized[normalized.length - 1]
    const next = tokens[index + 1]
    const text = normalizeAdjacentTextToken(token.content, previous, next)
    if (text) {
      normalized.push({ type: 'text', content: text })
    }
  }

  return normalized
}

export function formatChatMessageTokens(input: string): EmphasisToken[] {
  return normalizeChatMessageTokens(tokenizeChatMessage(input))
}
