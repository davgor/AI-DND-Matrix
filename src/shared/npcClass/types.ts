import type { Archetype } from '../../engine/hp'

export type NpcClassKey = Archetype | 'commoner'

export interface NpcClassRosterEntry {
  key: NpcClassKey
  label: string
  blurb: string
}

export const NPC_CLASS_KEYS = ['fighter', 'rogue', 'mage', 'cleric', 'ranger', 'commoner'] as const

export const NPC_CLASS_ROSTER: NpcClassRosterEntry[] = [
  {
    key: 'fighter',
    label: 'Fighter',
    blurb: 'Trained melee combatant, disciplined with weapons and armor.'
  },
  {
    key: 'rogue',
    label: 'Rogue',
    blurb: 'Stealthy and cunning, skilled at subterfuge or precision strikes.'
  },
  {
    key: 'mage',
    label: 'Mage',
    blurb: 'Studied arcane spellcaster who channels magic through training and ritual.'
  },
  {
    key: 'cleric',
    label: 'Cleric',
    blurb: 'Devoted spellcaster who channels divine power through faith or a deity.'
  },
  {
    key: 'ranger',
    label: 'Ranger',
    blurb: 'Wilderness-skilled warrior, a tracker and hunter at home outdoors.'
  },
  {
    key: 'commoner',
    label: 'Commoner',
    blurb:
      'Ordinary person with no adventuring training — defined by trade or role in daily life, not combat or magic.'
  }
]

export function isNpcClassKey(value: unknown): value is NpcClassKey {
  return typeof value === 'string' && (NPC_CLASS_KEYS as readonly string[]).includes(normalizeNpcClassKey(value))
}

/** Common LLM / D&D role names that are not roster keys but map cleanly. */
const NPC_CLASS_ALIASES: Record<string, NpcClassKey> = {
  wizard: 'mage',
  sorcerer: 'mage',
  warlock: 'mage',
  witch: 'mage',
  priest: 'cleric',
  priestess: 'cleric',
  healer: 'cleric',
  paladin: 'cleric',
  thief: 'rogue',
  assassin: 'rogue',
  warrior: 'fighter',
  knight: 'fighter',
  barbarian: 'fighter',
  soldier: 'fighter',
  hunter: 'ranger',
  scout: 'ranger',
  druid: 'ranger',
  herbalist: 'commoner',
  gardener: 'commoner',
  merchant: 'commoner',
  peasant: 'commoner',
  villager: 'commoner',
  civilian: 'commoner',
  bard: 'commoner',
  artisan: 'commoner'
}

export function parseNpcClassKey(value: unknown): NpcClassKey | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = normalizeNpcClassKey(value)
  if (isNpcClassKey(normalized)) {
    return normalized
  }
  const byLabel = NPC_CLASS_ROSTER.find(
    (entry) => normalizeNpcClassKey(entry.label) === normalized
  )
  if (byLabel) {
    return byLabel.key
  }
  return NPC_CLASS_ALIASES[normalized]
}

function normalizeNpcClassKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

export function findNpcClassRosterEntry(key: string): NpcClassRosterEntry | undefined {
  return NPC_CLASS_ROSTER.find((entry) => entry.key === key)
}
