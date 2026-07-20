import type Database from 'better-sqlite3'
import { generateOrGetBestiarySpecies } from '../agents/bestiary/generateSpecies'
import { slugifySpeciesKey } from '../agents/bestiary/generateSpeciesPrompts'
import type { Provider } from '../agents/providers/types'
import { getCreatureByKey } from '../db/catalog/creatures'
import {
  getBestiarySpeciesById,
  listBestiarySpecies,
  listBestiaryVariants,
  listQuestFoeAssignments,
  type QuestFoeAssignment
} from '../db/repositories/bestiary'
import { hydrateNpcFromCatalog, hydrateNpcWithFallback } from '../db/repositories/npcCombatHydration'
import { createNpc } from '../db/repositories/npcs'
import { listActiveQuestsForCharacter } from '../db/repositories/quests'
import {
  planEncounterComposition,
  type ThematicSignal
} from '../engine/encounterComposition'
import type {
  BestiarySpecies,
  BestiaryVariant,
  BestiaryVariantKey,
  CompositionSlot,
  SpawnOutcome
} from '../shared/bestiary/types'

const PROVISIONAL_HOSTILE_FALLBACK_NAME = 'Hostile creature'

/**
 * Pull a short foe label from common attack phrasing ("at the nearest beast").
 * Falls back when no usable target phrase is present.
 */
export function deriveProvisionalHostileName(playerInput: string): string {
  const cleaned = playerInput.replace(/^\*+|\*+$/g, '').trim()
  const atMatch = cleaned.match(
    /\b(?:at|toward|towards|against)\s+(?:the\s+|a\s+|an\s+)?(.+?)(?:[.!?]|$)/i
  )
  const raw = atMatch?.[1]?.trim()
  if (!raw) {
    return PROVISIONAL_HOSTILE_FALLBACK_NAME
  }
  const withoutNearest = raw.replace(/^(?:nearest|closest|nearest\s+of\s+the)\s+/i, '').trim()
  const label = withoutNearest.replace(/^(?:the|a|an)\s+/i, '').trim()
  if (label.length < 2) {
    return PROVISIONAL_HOSTILE_FALLBACK_NAME
  }
  const clipped = label.slice(0, 48)
  return clipped.charAt(0).toUpperCase() + clipped.slice(1)
}

export function detectThematicSignal(texts: string[]): ThematicSignal {
  const joined = texts.join(' ').toLowerCase()
  if (/\bcursed\b/.test(joined)) return 'cursed'
  if (/\bblight(?:ed)?\b/.test(joined)) return 'blight'
  if (/\brift\b/.test(joined)) return 'rift'
  return 'none'
}

function speciesMatchesHint(species: BestiarySpecies, needle: string, slug: string): boolean {
  const name = species.name.toLowerCase()
  return (
    species.key === slug ||
    name === needle ||
    species.key.includes(slug) ||
    (slug.length >= 3 && slug.includes(species.key)) ||
    name.includes(needle) ||
    (needle.length >= 3 && needle.includes(name))
  )
}

/** Prefer an existing campaign bestiary species by name/key substring. */
export function findMatchingBestiarySpecies(
  db: Database.Database,
  campaignId: string,
  hint: string
): BestiarySpecies | undefined {
  const needle = hint.toLowerCase().trim()
  if (needle.length < 2 || needle === PROVISIONAL_HOSTILE_FALLBACK_NAME.toLowerCase()) {
    return undefined
  }
  const slug = slugifySpeciesKey(hint)
  const listed = listBestiarySpecies(db, campaignId)
  const exact = listed.find(
    (species) => species.key === slug || species.name.toLowerCase() === needle
  )
  if (exact) return exact
  return listed.find((species) => speciesMatchesHint(species, needle, slug))
}

function inferTags(hint: string): string[] {
  const lower = hint.toLowerCase()
  if (lower.includes('wolf')) return ['pack-hunter']
  return []
}

function resolveCatalogKey(
  species: BestiarySpecies,
  variants: BestiaryVariant[],
  variantKey: BestiaryVariantKey
): string | null {
  const variant = variants.find((entry) => entry.variantKey === variantKey)
  return variant?.catalogKeyOverride ?? species.defaultCatalogKey
}

function instanceDisplayName(speciesName: string, variantKey: BestiaryVariantKey): string {
  if (variantKey === 'standard') return speciesName
  return `${speciesName} (${variantKey.replaceAll('_', ' ')})`
}

function hydrateSpawnedNpc(
  db: Database.Database,
  npcId: string,
  catalogKey: string | null
): void {
  if (catalogKey) {
    const creature = getCreatureByKey(db, catalogKey)
    if (creature) {
      hydrateNpcFromCatalog(db, npcId, creature)
      return
    }
  }
  hydrateNpcWithFallback(db, npcId)
}

function spawnInstanceNpc(input: {
  db: Database.Database
  campaignId: string
  regionId: string
  species: BestiarySpecies
  variants: BestiaryVariant[]
  variantKey: BestiaryVariantKey
}): string {
  const { db, campaignId, regionId, species, variants, variantKey } = input
  const catalogKey = resolveCatalogKey(species, variants, variantKey)
  const npc = createNpc(db, {
    campaignId,
    regionId,
    name: instanceDisplayName(species.name, variantKey),
    role: 'enemy',
    disposition: 'hostile',
    canSpeak: false,
    temperament: 'aggressive',
    backstory: species.baseLore.slice(0, 280),
    bestiarySpeciesId: species.id,
    bestiaryVariantKey: variantKey,
    skipCombatHydration: true
  })
  hydrateSpawnedNpc(db, npc.id, catalogKey)
  return npc.id
}

function materializeComposition(input: {
  db: Database.Database
  campaignId: string
  regionId: string
  species: BestiarySpecies
  slots: CompositionSlot[]
}): string[] {
  const variants = listBestiaryVariants(input.db, input.species.id)
  const ids: string[] = []
  for (const slot of input.slots) {
    for (let i = 0; i < slot.count; i += 1) {
      ids.push(
        spawnInstanceNpc({
          db: input.db,
          campaignId: input.campaignId,
          regionId: input.regionId,
          species: input.species,
          variants,
          variantKey: slot.variantKey
        })
      )
    }
  }
  return ids
}

function slotsForQuestAssignment(
  assignment: QuestFoeAssignment,
  species: BestiarySpecies,
  playerLevel: number,
  partySize: number
): CompositionSlot[] {
  const planned = assignment.plannedComposition
  if (planned) {
    const matching = planned.slots.filter((slot) => slot.speciesKey === species.key)
    if (matching.length > 0) {
      return matching
    }
  }
  return planEncounterComposition({
    playerLevel,
    partySize: Math.max(1, partySize),
    speciesKey: species.key,
    thematicSignal: 'none'
  }).slots
}

interface QuestPrepSpawnInput {
  db: Database.Database
  campaignId: string
  regionId: string
  playerCharacterId: string
  playerLevel: number
  partySize: number
}

/**
 * Quest prep (116.9): materialize foe assignments for an active character quest
 * matching this region. Never calls on-demand species generation.
 */
export function spawnQuestPreparedHostiles(input: QuestPrepSpawnInput): SpawnOutcome | null {
  const quests = listActiveQuestsForCharacter(input.db, input.playerCharacterId).filter(
    (quest) => quest.regionId == null || quest.regionId === input.regionId
  )
  for (const quest of quests) {
    const assignments = listQuestFoeAssignments(input.db, quest.id)
    if (assignments.length === 0) {
      continue
    }
    const ids = materializeQuestAssignments(input, assignments)
    if (ids.length > 0) {
      return { kind: 'success', instanceNpcIds: ids }
    }
  }
  return null
}

function materializeQuestAssignments(
  input: QuestPrepSpawnInput,
  assignments: QuestFoeAssignment[]
): string[] {
  const ids: string[] = []
  for (const assignment of assignments) {
    const species = getBestiarySpeciesById(input.db, assignment.speciesId)
    if (!species) {
      continue
    }
    const slots = slotsForQuestAssignment(
      assignment,
      species,
      input.playerLevel,
      input.partySize
    )
    ids.push(
      ...materializeComposition({
        db: input.db,
        campaignId: input.campaignId,
        regionId: input.regionId,
        species,
        slots
      })
    )
  }
  return ids
}

function spawnProvisionalHostile(input: {
  db: Database.Database
  campaignId: string
  regionId: string
  playerInput?: string
}): SpawnOutcome {
  const name = deriveProvisionalHostileName(input.playerInput ?? '')
  const npc = createNpc(input.db, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    name,
    role: 'enemy',
    disposition: 'hostile',
    canSpeak: false,
    temperament: 'aggressive',
    backstory:
      'Provisional combatant spawned when on-demand bestiary generation was unavailable.'
  })
  return { kind: 'fallback_provisional', instanceNpcIds: [npc.id] }
}

async function resolveSpeciesForOnDemand(input: {
  db: Database.Database
  provider: Provider | undefined
  campaignId: string
  hintName: string
  playerLevel: number
}): Promise<BestiarySpecies | undefined> {
  const existing = findMatchingBestiarySpecies(input.db, input.campaignId, input.hintName)
  if (existing) return existing
  if (!input.provider) return undefined
  const result = await generateOrGetBestiarySpecies(input.db, input.provider, {
    campaignId: input.campaignId,
    name: input.hintName,
    buckets: ['beast'],
    tags: inferTags(input.hintName),
    levelHint: input.playerLevel
  })
  return result.species
}

export interface OnDemandSpawnInput {
  db: Database.Database
  provider?: Provider
  campaignId: string
  regionId: string
  playerLevel: number
  partySize: number
  playerInput?: string
  regionText?: string
}

/**
 * On-demand (116.8): compose + spawn bestiary instances for empty-hostile startEncounter.
 * Falls back to ticket-115 provisional villager when species cannot be resolved.
 */
export async function spawnOnDemandEncounterHostiles(
  input: OnDemandSpawnInput
): Promise<SpawnOutcome> {
  const hintName = deriveProvisionalHostileName(input.playerInput ?? '')
  try {
    const species = await resolveSpeciesForOnDemand({
      db: input.db,
      provider: input.provider,
      campaignId: input.campaignId,
      hintName,
      playerLevel: input.playerLevel
    })
    if (!species) {
      return spawnProvisionalHostile(input)
    }
    const thematicSignal = detectThematicSignal([
      input.playerInput ?? '',
      input.regionText ?? ''
    ])
    const plan = planEncounterComposition({
      playerLevel: input.playerLevel,
      partySize: Math.max(1, input.partySize),
      speciesKey: species.key,
      thematicSignal
    })
    const ids = materializeComposition({
      db: input.db,
      campaignId: input.campaignId,
      regionId: input.regionId,
      species,
      slots: plan.slots
    })
    if (ids.length === 0) {
      return spawnProvisionalHostile(input)
    }
    return { kind: 'success', instanceNpcIds: ids }
  } catch {
    return spawnProvisionalHostile(input)
  }
}
