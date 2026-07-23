import type Database from 'better-sqlite3'
import { listAllCreatures } from '../db/catalog/creatures'
import type { CatalogCreature } from '../db/catalog/types'
import {
  listBestiarySpecies,
  listBestiaryVariants
} from '../db/repositories/bestiary'
import type { BestiaryReviewEntry } from '../shared/bestiary/reviewRoster'
import type { BestiarySpecies } from '../shared/bestiary/types'

function catalogLoreBlurb(creature: CatalogCreature): string {
  const buckets = creature.buckets.length > 0 ? creature.buckets.join(', ') : 'none'
  const tags = creature.tags.length > 0 ? creature.tags.join(', ') : 'none'
  const archetype = creature.archetypeHint ? ` Archetype hint: ${creature.archetypeHint}.` : ''
  return (
    `Default catalog enemy (seed template). Levels ${creature.levelMin}–${creature.levelMax}.` +
    ` Buckets: ${buckets}. Tags: ${tags}.${archetype}`
  )
}

function catalogToDefaultEntry(
  creature: CatalogCreature,
  campaignId: string
): BestiaryReviewEntry {
  const species: BestiarySpecies = {
    id: `catalog:${creature.key}`,
    campaignId,
    key: creature.key,
    name: creature.name,
    baseLore: catalogLoreBlurb(creature),
    visualAppearance: null,
    creatureTokenPath: null,
    buckets: creature.buckets,
    tags: creature.tags,
    defaultCatalogKey: creature.key
  }
  return {
    origin: 'default',
    species,
    variants: [
      {
        variantKey: 'standard',
        flavorBlurb: 'Catalog combat template',
        catalogKeyOverride: creature.key
      }
    ]
  }
}

function campaignOccupiedCatalogKeys(speciesList: BestiarySpecies[]): Set<string> {
  const keys = new Set<string>()
  for (const species of speciesList) {
    keys.add(species.key)
    if (species.defaultCatalogKey) {
      keys.add(species.defaultCatalogKey)
    }
  }
  return keys
}

/** Campaign species plus catalog seeds not already claimed by this campaign’s roster. */
export function buildCampaignBestiaryRoster(
  db: Database.Database,
  campaignId: string
): BestiaryReviewEntry[] {
  const speciesList = listBestiarySpecies(db, campaignId)
  const campaignEntries: BestiaryReviewEntry[] = speciesList.map((species) => ({
    origin: 'campaign',
    species,
    variants: listBestiaryVariants(db, species.id)
  }))

  const occupied = campaignOccupiedCatalogKeys(speciesList)
  const defaultEntries = listAllCreatures(db)
    .filter((creature) => creature.source === 'seed' && !occupied.has(creature.key))
    .map((creature) => catalogToDefaultEntry(creature, campaignId))

  return [...campaignEntries, ...defaultEntries].sort((a, b) =>
    a.species.name.localeCompare(b.species.name)
  )
}
