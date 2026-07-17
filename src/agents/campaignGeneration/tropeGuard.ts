import type { GeneratedRegion, GeneratedWorld } from './types'
import { meetsProseJargonStandards } from './proseJargonGuard'

const KRAKEN_PATTERN = /\bkrakens?\b/i
const ZIGGURAT_PATTERN = /\bziggurats?\b/i

function allowsKraken(premise: string): boolean {
  return /\bkraken|leviathan|sea monster|colossal squid|tentacled horror\b/i.test(premise)
}

function allowsZiggurat(premise: string): boolean {
  return /\bziggurat|stepped temple|step pyramid|mesopotam|babylon\b/i.test(premise)
}

export function findDisallowedDefaultTropes(prose: string, premise: string): string[] {
  const premiseLower = premise.toLowerCase()
  const found: string[] = []
  if (KRAKEN_PATTERN.test(prose) && !allowsKraken(premiseLower)) {
    found.push('kraken')
  }
  if (ZIGGURAT_PATTERN.test(prose) && !allowsZiggurat(premiseLower)) {
    found.push('ziggurat')
  }
  return found
}

export function meetsPremiseTropeDiversity(prose: string, premise: string): boolean {
  return findDisallowedDefaultTropes(prose, premise).length === 0 && meetsProseJargonStandards(prose)
}

export function meetsWorldTropeDiversity(world: GeneratedWorld, premise: string): boolean {
  // Check fields separately. Joining with a single `\n` merges adjacent
  // paragraphs in splitParagraphs and can false-reject valid hyphen budgets.
  return [world.worldName, world.worldSummary, world.worldHistory].every((prose) =>
    meetsPremiseTropeDiversity(prose, premise)
  )
}

export function meetsRegionTropeDiversity(region: GeneratedRegion, premise: string): boolean {
  return [
    region.name,
    region.description,
    region.historyBackstory,
    region.recentHistory,
    ...region.potentialQuests
  ].every((prose) => meetsPremiseTropeDiversity(prose, premise))
}
