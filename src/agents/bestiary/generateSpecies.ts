import type Database from 'better-sqlite3'
import { retrieveCreatures } from '../../db/catalog/retrieval'
import {
  createBestiarySpecies,
  getBestiarySpeciesByKey,
  listBestiaryVariants,
  type CreateBestiaryVariantInput
} from '../../db/repositories/bestiary'
import type { BestiarySpecies, BestiaryVariant } from '../../shared/bestiary/types'
import type { Bucket } from '../../shared/catalogTaxonomy'
import { generateJsonWithRetry } from '../jsonResponse'
import type { GenerateContext, Provider } from '../providers/types'
import {
  buildSpeciesLorePrompt,
  slugifySpeciesKey,
  SPECIES_LORE_SYSTEM_PROMPT
} from './generateSpeciesPrompts'

export interface GenerateSpeciesProposal {
  campaignId: string
  name: string
  speciesKey?: string
  buckets?: Bucket[]
  tags?: string[]
  settingHints?: string
  levelHint?: number
  /** If provided, skip LLM and use this as baseLore */
  presetLore?: string
}

export interface GenerateSpeciesResult {
  species: BestiarySpecies
  variants: BestiaryVariant[]
  catalogKey: string | null
  created: boolean
}

const SPECIES_LORE_GENERATE_CONTEXT: GenerateContext = {
  systemPrompt: SPECIES_LORE_SYSTEM_PROMPT,
  maxTokens: 512
}

const DEFAULT_VARIANTS: CreateBestiaryVariantInput[] = [
  { variantKey: 'standard', flavorBlurb: 'Typical member of the species' },
  { variantKey: 'alpha', flavorBlurb: 'Elevated pack leader or champion' },
  { variantKey: 'cursed', flavorBlurb: 'Thematically blighted or warped specimen' }
]

function parseSpeciesLore(parsed: unknown): { baseLore: string } | undefined {
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined
  }
  const record = parsed as Record<string, unknown>
  const baseLore = record['baseLore']
  if (typeof baseLore !== 'string' || baseLore.trim().length === 0) {
    return undefined
  }
  // Intentionally ignore hp/ac/damage and any other combat fields the model may invent.
  return { baseLore: baseLore.trim() }
}

function normalizeSpeciesKey(proposal: GenerateSpeciesProposal): string {
  const raw = proposal.speciesKey?.trim() ? proposal.speciesKey : proposal.name
  const speciesKey = slugifySpeciesKey(raw)
  if (!speciesKey) {
    throw new Error('speciesKey resolved to an empty slug')
  }
  return speciesKey
}

function existingResult(species: BestiarySpecies, db: Database.Database): GenerateSpeciesResult {
  return {
    species,
    variants: listBestiaryVariants(db, species.id),
    catalogKey: species.defaultCatalogKey,
    created: false
  }
}

function pickCatalogKey(
  db: Database.Database,
  buckets: Bucket[],
  tags: string[],
  levelHint?: number
): string | null {
  const retrieval = retrieveCreatures(db, {
    buckets: buckets.length > 0 ? buckets : undefined,
    tags: tags.length > 0 ? tags : undefined,
    level: levelHint,
    limit: 3
  })
  return retrieval[0]?.entry.key ?? null
}

async function resolveBaseLore(
  provider: Provider,
  proposal: GenerateSpeciesProposal,
  buckets: Bucket[],
  tags: string[]
): Promise<string> {
  if (proposal.presetLore !== undefined) {
    const trimmed = proposal.presetLore.trim()
    if (trimmed.length === 0) {
      throw new Error('presetLore must be a non-empty string')
    }
    return trimmed
  }

  const lore = await generateJsonWithRetry(
    provider,
    () =>
      buildSpeciesLorePrompt({
        name: proposal.name,
        buckets,
        tags,
        settingHints: proposal.settingHints
      }),
    parseSpeciesLore,
    {
      context: SPECIES_LORE_GENERATE_CONTEXT,
      exhaustedError: () =>
        new Error('Species lore generation did not return valid baseLore after retries')
    }
  )
  return lore.baseLore
}

export async function generateOrGetBestiarySpecies(
  db: Database.Database,
  provider: Provider,
  proposal: GenerateSpeciesProposal
): Promise<GenerateSpeciesResult> {
  const speciesKey = normalizeSpeciesKey(proposal)
  const existing = getBestiarySpeciesByKey(db, proposal.campaignId, speciesKey)
  if (existing) {
    return existingResult(existing, db)
  }

  const buckets = proposal.buckets ?? []
  const tags = proposal.tags ?? []
  const catalogKey = pickCatalogKey(db, buckets, tags, proposal.levelHint)
  const baseLore = await resolveBaseLore(provider, proposal, buckets, tags)

  const species = createBestiarySpecies(db, {
    campaignId: proposal.campaignId,
    key: speciesKey,
    name: proposal.name,
    baseLore,
    buckets,
    tags,
    defaultCatalogKey: catalogKey,
    variants: DEFAULT_VARIANTS
  })

  return {
    species,
    variants: listBestiaryVariants(db, species.id),
    catalogKey,
    created: true
  }
}

export { slugifySpeciesKey, buildSpeciesLorePrompt } from './generateSpeciesPrompts'
