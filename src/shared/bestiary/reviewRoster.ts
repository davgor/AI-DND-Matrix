import type { BestiarySpecies, BestiaryVariant } from './types'

export const BESTIARY_ENTRY_ORIGINS = ['default', 'campaign'] as const
export type BestiaryEntryOrigin = (typeof BESTIARY_ENTRY_ORIGINS)[number]

export const BESTIARY_ORIGIN_FILTERS = ['all', 'default', 'campaign'] as const
export type BestiaryOriginFilter = (typeof BESTIARY_ORIGIN_FILTERS)[number]

/** Review/hub roster row: campaign species or catalog seed surfaced as a default enemy. */
export interface BestiaryReviewEntry {
  species: BestiarySpecies
  variants: BestiaryVariant[]
  origin: BestiaryEntryOrigin
}

export function isBestiaryOriginFilter(value: unknown): value is BestiaryOriginFilter {
  return typeof value === 'string' && (BESTIARY_ORIGIN_FILTERS as readonly string[]).includes(value)
}

export function deriveSpeciesNameFromPrompt(prompt: string): string {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return 'Custom Beast'
  }
  const firstLine = trimmed.split(/\r?\n/, 1)[0]?.trim() ?? ''
  const firstLineWords = firstLine.split(/\s+/).filter(Boolean)
  const looksLikeTitle =
    firstLine.length > 0 &&
    firstLine.length <= 60 &&
    !firstLine.includes('.') &&
    (firstLineWords.length <= 4 || /^[A-Z]/.test(firstLine))
  if (looksLikeTitle) {
    return firstLine
  }
  const words = trimmed
    .replace(/[^\w\s'-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
  if (words.length === 0) {
    return 'Custom Beast'
  }
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
}

function entryHaystack(entry: BestiaryReviewEntry): string {
  const { species } = entry
  return [
    species.name,
    species.baseLore,
    species.key,
    species.buckets.join(' '),
    species.tags.join(' '),
    entry.origin,
    ...entry.variants.map((variant) => `${variant.variantKey} ${variant.flavorBlurb ?? ''}`)
  ]
    .join(' ')
    .toLowerCase()
}

export function filterBestiaryReviewEntries(
  entries: BestiaryReviewEntry[],
  input: { query: string; originFilter: BestiaryOriginFilter }
): BestiaryReviewEntry[] {
  const needle = input.query.trim().toLowerCase()
  return entries.filter((entry) => {
    if (input.originFilter !== 'all' && entry.origin !== input.originFilter) {
      return false
    }
    if (!needle) {
      return true
    }
    return entryHaystack(entry).includes(needle)
  })
}

export function countBestiaryOrigins(entries: BestiaryReviewEntry[]): {
  defaultCount: number
  campaignCount: number
} {
  let defaultCount = 0
  let campaignCount = 0
  for (const entry of entries) {
    if (entry.origin === 'default') {
      defaultCount += 1
    } else {
      campaignCount += 1
    }
  }
  return { defaultCount, campaignCount }
}
