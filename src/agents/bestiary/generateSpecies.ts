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
import {
  hasUsableCreatureAppearance,
  normalizeCreatureAppearance,
  type CreatureAppearanceTraits
} from '../../shared/creatureTokens/appearance'
import { generateJsonWithRetry } from '../jsonResponse'
import type { GenerateContext, Provider } from '../providers/types'
import {
  buildSpeciesAppearancePrompt,
  buildSpeciesLorePrompt,
  parseSpeciesAppearanceResponse,
  parseSpeciesLoreResponse,
  slugifySpeciesKey,
  SPECIES_APPEARANCE_SYSTEM_PROMPT,
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
  /** If provided, skip lore LLM and use this as baseLore */
  presetLore?: string
  /** Optional preset appearance; when presetLore is set without this, a smaller appearance-only LLM call runs */
  presetAppearance?: CreatureAppearanceTraits
}

export interface GenerateSpeciesResult {
  species: BestiarySpecies
  variants: BestiaryVariant[]
  catalogKey: string | null
  created: boolean
}

export interface GenerateSpeciesOptions {
  onSpeciesCreated?: (input: { campaignId: string; speciesId: string }) => void
}

const SPECIES_LORE_GENERATE_CONTEXT: GenerateContext = {
  systemPrompt: SPECIES_LORE_SYSTEM_PROMPT,
  maxTokens: 768,
  purpose: 'campaign.npc'
}

const SPECIES_APPEARANCE_GENERATE_CONTEXT: GenerateContext = {
  systemPrompt: SPECIES_APPEARANCE_SYSTEM_PROMPT,
  maxTokens: 384,
  purpose: 'campaign.npc'
}

const DEFAULT_VARIANTS: CreateBestiaryVariantInput[] = [
  { variantKey: 'standard', flavorBlurb: 'Typical member of the species' },
  { variantKey: 'alpha', flavorBlurb: 'Elevated pack leader or champion' },
  { variantKey: 'cursed', flavorBlurb: 'Thematically blighted or warped specimen' }
]

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

function normalizePresetAppearance(
  appearance: CreatureAppearanceTraits | undefined
): CreatureAppearanceTraits | null {
  if (appearance === undefined) {
    return null
  }
  const normalized = normalizeCreatureAppearance(appearance)
  return hasUsableCreatureAppearance(normalized) ? normalized : null
}

async function generateAppearanceFromPresetLore(input: {
  provider: Provider
  proposal: GenerateSpeciesProposal
  baseLore: string
  buckets: Bucket[]
  tags: string[]
}): Promise<CreatureAppearanceTraits | null> {
  try {
    const appearanceOnly = await generateJsonWithRetry(
      input.provider,
      () =>
        buildSpeciesAppearancePrompt({
          name: input.proposal.name,
          baseLore: input.baseLore,
          buckets: input.buckets,
          tags: input.tags
        }),
      parseSpeciesAppearanceResponse,
      {
        context: {
          ...SPECIES_APPEARANCE_GENERATE_CONTEXT,
          campaignId: input.proposal.campaignId
        },
        exhaustedError: () =>
          new Error('Species appearance generation did not return valid visualAppearance after retries')
      }
    )
    return appearanceOnly.visualAppearance
  } catch {
    // Species still creates when appearance-only follow-up fails (campaign create preset lore path).
    return null
  }
}

async function resolvePresetLoreAndAppearance(
  provider: Provider,
  proposal: GenerateSpeciesProposal,
  buckets: Bucket[],
  tags: string[]
): Promise<{ baseLore: string; visualAppearance: CreatureAppearanceTraits | null }> {
  const trimmed = proposal.presetLore!.trim()
  if (trimmed.length === 0) {
    throw new Error('presetLore must be a non-empty string')
  }
  const presetAppearance = normalizePresetAppearance(proposal.presetAppearance)
  if (presetAppearance) {
    return { baseLore: trimmed, visualAppearance: presetAppearance }
  }
  const visualAppearance = await generateAppearanceFromPresetLore({
    provider,
    proposal,
    baseLore: trimmed,
    buckets,
    tags
  })
  return { baseLore: trimmed, visualAppearance }
}

async function resolveGeneratedLoreAndAppearance(
  provider: Provider,
  proposal: GenerateSpeciesProposal,
  buckets: Bucket[],
  tags: string[]
): Promise<{ baseLore: string; visualAppearance: CreatureAppearanceTraits }> {
  const lore = await generateJsonWithRetry(
    provider,
    () =>
      buildSpeciesLorePrompt({
        name: proposal.name,
        buckets,
        tags,
        settingHints: proposal.settingHints
      }),
    parseSpeciesLoreResponse,
    {
      context: { ...SPECIES_LORE_GENERATE_CONTEXT, campaignId: proposal.campaignId },
      exhaustedError: () =>
        new Error('Species lore generation did not return valid baseLore and visualAppearance after retries')
    }
  )
  return { baseLore: lore.baseLore, visualAppearance: lore.visualAppearance }
}

async function resolveLoreAndAppearance(
  provider: Provider,
  proposal: GenerateSpeciesProposal,
  buckets: Bucket[],
  tags: string[]
): Promise<{ baseLore: string; visualAppearance: CreatureAppearanceTraits | null }> {
  if (proposal.presetLore !== undefined) {
    return resolvePresetLoreAndAppearance(provider, proposal, buckets, tags)
  }
  return resolveGeneratedLoreAndAppearance(provider, proposal, buckets, tags)
}

export async function generateOrGetBestiarySpecies(
  db: Database.Database,
  provider: Provider,
  proposal: GenerateSpeciesProposal,
  options?: GenerateSpeciesOptions
): Promise<GenerateSpeciesResult> {
  const speciesKey = normalizeSpeciesKey(proposal)
  const existing = getBestiarySpeciesByKey(db, proposal.campaignId, speciesKey)
  if (existing) {
    return existingResult(existing, db)
  }

  const buckets = proposal.buckets ?? []
  const tags = proposal.tags ?? []
  const catalogKey = pickCatalogKey(db, buckets, tags, proposal.levelHint)
  const { baseLore, visualAppearance } = await resolveLoreAndAppearance(provider, proposal, buckets, tags)

  const species = createBestiarySpecies(db, {
    campaignId: proposal.campaignId,
    key: speciesKey,
    name: proposal.name,
    baseLore,
    visualAppearance,
    buckets,
    tags,
    defaultCatalogKey: catalogKey,
    variants: DEFAULT_VARIANTS
  })

  options?.onSpeciesCreated?.({ campaignId: proposal.campaignId, speciesId: species.id })

  return {
    species,
    variants: listBestiaryVariants(db, species.id),
    catalogKey,
    created: true
  }
}

export {
  slugifySpeciesKey,
  buildSpeciesLorePrompt,
  buildSpeciesAppearancePrompt,
  parseSpeciesLoreResponse,
  parseSpeciesAppearanceResponse
} from './generateSpeciesPrompts'
