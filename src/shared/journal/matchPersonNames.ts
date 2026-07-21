import type { PersonMatchCandidate, PersonNameMatchSpan } from './types'

const WORD_CHAR = /[A-Za-z0-9_]/

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && WORD_CHAR.test(ch)
}

function hasWordBoundaries(text: string, start: number, end: number): boolean {
  return !isWordChar(text[start - 1]) && !isWordChar(text[end])
}

function overlapsClaimed(start: number, end: number, claimed: PersonNameMatchSpan[]): boolean {
  return claimed.some((span) => start < span.end && end > span.start)
}

function normalizeName(name: string): string {
  return name.toLowerCase()
}

/** Unambiguous candidates sorted longest-name-first (then npcId). */
function resolveMatchableCandidates(
  candidates: PersonMatchCandidate[]
): PersonMatchCandidate[] {
  const byName = new Map<string, PersonMatchCandidate[]>()
  for (const candidate of candidates) {
    const key = normalizeName(candidate.name)
    if (key.length === 0) continue
    const group = byName.get(key) ?? []
    group.push(candidate)
    byName.set(key, group)
  }

  const matchable: PersonMatchCandidate[] = []
  for (const group of byName.values()) {
    if (group.length !== 1) continue
    matchable.push(group[0])
  }

  return matchable.sort((a, b) => {
    const lengthDelta = b.name.length - a.name.length
    if (lengthDelta !== 0) return lengthDelta
    return a.npcId.localeCompare(b.npcId)
  })
}

function findHitsForCandidate(
  text: string,
  lowerText: string,
  candidate: PersonMatchCandidate,
  claimed: PersonNameMatchSpan[]
): PersonNameMatchSpan[] {
  const needle = normalizeName(candidate.name)
  if (needle.length === 0) return []

  const hits: PersonNameMatchSpan[] = []
  let from = 0
  while (from <= lowerText.length - needle.length) {
    const start = lowerText.indexOf(needle, from)
    if (start < 0) break
    const end = start + needle.length
    from = start + 1
    if (!hasWordBoundaries(text, start, end)) continue
    if (overlapsClaimed(start, end, claimed) || overlapsClaimed(start, end, hits)) continue
    hits.push({ start, end, npcId: candidate.npcId })
  }
  return hits
}

/**
 * Find non-overlapping person-name spans in journal prose.
 * See `src/shared/journal/SPEC.md` for candidate, boundary, and ambiguity rules.
 */
export function matchPersonNames(
  text: string,
  candidates: PersonMatchCandidate[]
): PersonNameMatchSpan[] {
  if (text.length === 0 || candidates.length === 0) return []

  const lowerText = text.toLowerCase()
  const matchable = resolveMatchableCandidates(candidates)
  const claimed: PersonNameMatchSpan[] = []

  for (const candidate of matchable) {
    claimed.push(...findHitsForCandidate(text, lowerText, candidate, claimed))
  }

  return claimed.sort((a, b) => a.start - b.start)
}
