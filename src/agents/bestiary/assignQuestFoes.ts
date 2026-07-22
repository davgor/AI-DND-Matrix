import type Database from 'better-sqlite3'
import {
  getBestiarySpeciesByKey,
  listBestiarySpecies,
  listQuestFoeAssignments,
  setQuestFoeAssignment,
  type QuestFoeAssignment
} from '../../db/repositories/bestiary'
import { planEncounterComposition, type ThematicSignal } from '../../engine/encounterComposition'
import type { BestiarySpecies } from '../../shared/bestiary/types'
import type { Bucket } from '../../shared/catalogTaxonomy'
import type { Provider } from '../providers/types'
import { generateOrGetBestiarySpecies } from './generateSpecies'
import { slugifySpeciesKey } from './generateSpeciesPrompts'

interface ParsedEnemyHint {
  name: string
  speciesKey: string
  buckets: Bucket[]
  tags: string[]
  thematicSignal?: ThematicSignal
  presetLore?: string
}

interface KnownFoePattern {
  pattern: RegExp
  name: string
  speciesKey: string
  buckets: Bucket[]
  tags: string[]
  thematicSignal?: ThematicSignal
  presetLore: string
}

const RIFT_BEAST_LORE =
  'Rift-beasts stalk the torn edges of the world, hunting in packs near planar scars. Locals know them by the low howl that carries before a storm of violet light.'

const KNOWN_FOE_PATTERNS: KnownFoePattern[] = [
  {
    pattern: /\brift[-\s]?beasts?\b/i,
    name: 'Rift-beast',
    speciesKey: 'rift-beast',
    buckets: ['beast'],
    tags: ['rift', 'pack-hunter'],
    thematicSignal: 'rift',
    presetLore: RIFT_BEAST_LORE
  },
  {
    pattern: /\bwolves\b|\bwolf\b/i,
    name: 'Wolf',
    speciesKey: 'wolf',
    buckets: ['beast'],
    tags: ['pack-hunter'],
    presetLore:
      'Wolves hunt the roads and forest edges in coordinated packs, wary of firelight and bold when prey looks weak.'
  },
  {
    pattern: /\bgoblins?\b/i,
    name: 'Goblin',
    speciesKey: 'goblin',
    buckets: ['goblinoid'],
    tags: ['raiders'],
    presetLore:
      'Goblins raid in opportunistic bands, favoring ambushes, scrap weapons, and the cover of ruined outposts.'
  },
  {
    pattern: /\bslimes?\b/i,
    name: 'Slime',
    speciesKey: 'slime',
    buckets: ['elemental'],
    tags: ['ooze', 'corrosive'],
    presetLore:
      'Slimes seep through damp stone and refuse, dissolving organic matter and leaving a glistening trail behind.'
  }
]

const VERB_CAPTURE =
  /(?:clear|slay|defeat|hunt|exterminate|kill)\s+(?:the\s+)?([a-zA-Z][a-zA-Z0-9\s-]{0,40}?)(?=\s+from\b|\s+in\b|\s+at\b|\s+near\b|\s+of\b|[.,;:!?]|$)/gi

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'from',
  'in',
  'at',
  'near',
  'of',
  'and',
  'or',
  'some',
  'all',
  'those',
  'these',
  'their',
  'them',
  'it',
  'its',
  'him',
  'her',
  'his',
  'hers',
  'they',
  'you',
  'your',
  'out',
  'away',
  'back'
])

function singularizeToken(token: string): string {
  if (token.length <= 2 || token.endsWith('ss') || !token.endsWith('s')) {
    return token
  }
  return token.slice(0, -1)
}

function singularizePhrase(raw: string): string {
  const tokens = raw
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))
  if (tokens.length === 0) {
    return ''
  }
  tokens[tokens.length - 1] = singularizeToken(tokens[tokens.length - 1]!)
  return tokens.join(' ')
}

function displayNameFromKey(speciesKey: string): string {
  return speciesKey
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-')
}

function hintFromKnown(known: KnownFoePattern): ParsedEnemyHint {
  return {
    name: known.name,
    speciesKey: known.speciesKey,
    buckets: known.buckets,
    tags: known.tags,
    ...(known.thematicSignal !== undefined ? { thematicSignal: known.thematicSignal } : {}),
    presetLore: known.presetLore
  }
}

function hintFromNounPhrase(phrase: string): ParsedEnemyHint | null {
  const singular = singularizePhrase(phrase)
  if (!singular || STOP_WORDS.has(singular)) {
    return null
  }
  const speciesKey = slugifySpeciesKey(singular)
  if (!speciesKey || speciesKey.length < 2 || STOP_WORDS.has(speciesKey)) {
    return null
  }
  return {
    name: displayNameFromKey(speciesKey),
    speciesKey,
    buckets: ['beast'],
    tags: [speciesKey]
  }
}

/** Parse enemy species hints from quest title + summary (known tags + verb heuristics). */
export function parseEnemyHintsFromQuestText(title: string, summary: string): ParsedEnemyHint[] {
  const text = `${title}\n${summary}`
  const byKey = new Map<string, ParsedEnemyHint>()

  for (const known of KNOWN_FOE_PATTERNS) {
    if (known.pattern.test(text)) {
      byKey.set(known.speciesKey, hintFromKnown(known))
    }
    known.pattern.lastIndex = 0
  }

  for (const match of text.matchAll(VERB_CAPTURE)) {
    const captured = match[1]?.trim()
    if (!captured) {
      continue
    }
    const knownHit = KNOWN_FOE_PATTERNS.find((k) => k.pattern.test(captured))
    for (const k of KNOWN_FOE_PATTERNS) {
      k.pattern.lastIndex = 0
    }
    if (knownHit) {
      byKey.set(knownHit.speciesKey, hintFromKnown(knownHit))
      continue
    }
    const hint = hintFromNounPhrase(captured)
    if (hint && !byKey.has(hint.speciesKey)) {
      byKey.set(hint.speciesKey, hint)
    }
  }

  return [...byKey.values()]
}

function findExistingSpecies(
  campaignSpecies: BestiarySpecies[],
  hint: ParsedEnemyHint
): BestiarySpecies | undefined {
  const keyMatch = campaignSpecies.find((s) => s.key === hint.speciesKey)
  if (keyMatch) {
    return keyMatch
  }
  const nameLower = hint.name.toLowerCase()
  return campaignSpecies.find(
    (s) =>
      s.name.toLowerCase() === nameLower ||
      s.tags.some((tag) => slugifySpeciesKey(tag) === hint.speciesKey) ||
      slugifySpeciesKey(s.name) === hint.speciesKey
  )
}

interface AssignQuestFoesInput {
  campaignId: string
  questId: string
  title: string
  summary: string
  playerLevel?: number
  partySize?: number
}

export interface AssignQuestFoesOptions {
  onSpeciesCreated?: (input: { campaignId: string; speciesId: string }) => void
}

async function resolveSpeciesForHint(input: {
  db: Database.Database
  provider: Provider
  campaignId: string
  campaignSpecies: BestiarySpecies[]
  hint: ParsedEnemyHint
  playerLevel?: number
  onSpeciesCreated?: AssignQuestFoesOptions['onSpeciesCreated']
}): Promise<BestiarySpecies> {
  const { db, provider, campaignId, campaignSpecies, hint, playerLevel, onSpeciesCreated } = input
  let species = findExistingSpecies(campaignSpecies, hint)
  if (!species) {
    species = getBestiarySpeciesByKey(db, campaignId, hint.speciesKey)
  }
  if (species) {
    return species
  }
  const generated = await generateOrGetBestiarySpecies(
    db,
    provider,
    {
      campaignId,
      name: hint.name,
      speciesKey: hint.speciesKey,
      buckets: hint.buckets,
      tags: hint.tags,
      levelHint: playerLevel,
      ...(hint.presetLore !== undefined ? { presetLore: hint.presetLore } : {})
    },
    { onSpeciesCreated }
  )
  campaignSpecies.push(generated.species)
  return generated.species
}

/**
 * Resolve enemy hints from quest text to campaign bestiary species and persist
 * quest foe assignments. Does not start combat.
 */
export async function assignQuestFoes(
  db: Database.Database,
  provider: Provider,
  input: AssignQuestFoesInput,
  options?: AssignQuestFoesOptions
): Promise<QuestFoeAssignment[]> {
  const hints = parseEnemyHintsFromQuestText(input.title, input.summary)
  if (hints.length === 0) {
    return listQuestFoeAssignments(db, input.questId)
  }

  const campaignSpecies = listBestiarySpecies(db, input.campaignId)
  const assignments: {
    speciesId: string
    plannedComposition?: ReturnType<typeof planEncounterComposition>
  }[] = []

  for (const hint of hints) {
    const species = await resolveSpeciesForHint({
      db,
      provider,
      campaignId: input.campaignId,
      campaignSpecies,
      hint,
      playerLevel: input.playerLevel,
      onSpeciesCreated: options?.onSpeciesCreated
    })
    const plannedComposition =
      typeof input.playerLevel === 'number'
        ? planEncounterComposition({
            playerLevel: input.playerLevel,
            partySize: input.partySize ?? 1,
            speciesKey: species.key,
            ...(hint.thematicSignal !== undefined ? { thematicSignal: hint.thematicSignal } : {})
          })
        : undefined

    assignments.push({
      speciesId: species.id,
      ...(plannedComposition !== undefined ? { plannedComposition } : {})
    })
  }

  return setQuestFoeAssignment(db, input.questId, assignments)
}
