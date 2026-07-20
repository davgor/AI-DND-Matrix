import type Database from 'better-sqlite3'
import { getBestiarySpeciesById } from '../../db/repositories/bestiary'
import { getBestiarySpeciesGrounding } from '../../db/repositories/bestiaryKnowledge'

/** Cap base lore excerpts so narration prompts stay within 040 token budgets. */
export const BESTIARY_RECALL_BASE_LORE_MAX = 200
/** Max distinct species recalled for present NPCs in one context assembly. */
const BESTIARY_RECALL_MAX_SPECIES = 4
/** Max discovered-fact titles per species. */
const BESTIARY_RECALL_MAX_FACT_TITLES = 5

export interface PresentNpcForBestiaryRecall {
  id: string
  bestiarySpeciesId: string | null
}

export interface SlimPresentBestiaryGrounding {
  speciesId: string
  speciesName: string
  baseLoreExcerpt: string
  discoveredFactTitles: string[]
}

function excerptBaseLore(baseLore: string): string {
  const trimmed = baseLore.trim()
  if (trimmed.length <= BESTIARY_RECALL_BASE_LORE_MAX) {
    return trimmed
  }
  return `${trimmed.slice(0, BESTIARY_RECALL_BASE_LORE_MAX - 1)}…`
}

function uniqueSpeciesIds(presentNpcs: PresentNpcForBestiaryRecall[]): string[] {
  const seen = new Set<string>()
  const ids: string[] = []
  for (const npc of presentNpcs) {
    if (!npc.bestiarySpeciesId || seen.has(npc.bestiarySpeciesId)) {
      continue
    }
    seen.add(npc.bestiarySpeciesId)
    ids.push(npc.bestiarySpeciesId)
    if (ids.length >= BESTIARY_RECALL_MAX_SPECIES) {
      break
    }
  }
  return ids
}

/**
 * Slim bestiary lore/facts for DM narration when bestiary-linked instances are present.
 * Dedupes by species; caps lore length and fact-title count for token budget (040).
 */
export function loadPresentBestiaryGrounding(
  db: Database.Database,
  input: { characterId: string; presentNpcs: PresentNpcForBestiaryRecall[] }
): SlimPresentBestiaryGrounding[] {
  const grounding: SlimPresentBestiaryGrounding[] = []
  for (const speciesId of uniqueSpeciesIds(input.presentNpcs)) {
    const species = getBestiarySpeciesById(db, speciesId)
    if (!species) {
      continue
    }
    const full = getBestiarySpeciesGrounding(db, speciesId, input.characterId)
    grounding.push({
      speciesId,
      speciesName: species.name,
      baseLoreExcerpt: excerptBaseLore(full.baseLore),
      discoveredFactTitles: full.discoveredFacts
        .map((fact) => fact.title)
        .slice(0, BESTIARY_RECALL_MAX_FACT_TITLES)
    })
  }
  return grounding
}
