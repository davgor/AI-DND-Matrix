import { extractSentences, splitParagraphs } from './normalize'

/** No single sentence should read like a hyphenated word salad. */
export const MAX_HYPHEN_COMPOUNDS_PER_SENTENCE = 1

/** Keep compounds sparse even across a full paragraph. */
export const MAX_HYPHEN_COMPOUNDS_PER_PARAGRAPH = 2

const HYPHEN_COMPOUND_PATTERN = /\b[A-Za-z]+(?:-[A-Za-z]+)+\b/g

export function extractHyphenatedCompounds(text: string): string[] {
  const matches = text.match(HYPHEN_COMPOUND_PATTERN) ?? []
  return [...new Set(matches.map((word) => word.toLowerCase()))]
}

export function findProseJargonViolations(prose: string): string[] {
  const violations: string[] = []

  for (const [index, sentence] of extractSentences(prose).entries()) {
    const compounds = extractHyphenatedCompounds(sentence)
    if (compounds.length > MAX_HYPHEN_COMPOUNDS_PER_SENTENCE) {
      violations.push(
        `sentence ${index + 1}: too many hyphen compounds (${compounds.join(', ')})`
      )
    }
  }

  for (const [index, paragraph] of splitParagraphs(prose).entries()) {
    const compounds = extractHyphenatedCompounds(paragraph)
    if (compounds.length > MAX_HYPHEN_COMPOUNDS_PER_PARAGRAPH) {
      violations.push(
        `paragraph ${index + 1}: too many hyphen compounds (${compounds.join(', ')})`
      )
    }
  }

  return violations
}

export function meetsProseJargonStandards(prose: string): boolean {
  return findProseJargonViolations(prose).length === 0
}
