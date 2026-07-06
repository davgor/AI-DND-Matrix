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

export function parseNpcClassKey(value: unknown): NpcClassKey | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = normalizeNpcClassKey(value)
  return isNpcClassKey(normalized) ? normalized : undefined
}

function normalizeNpcClassKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

export function findNpcClassRosterEntry(key: string): NpcClassRosterEntry | undefined {
  return NPC_CLASS_ROSTER.find((entry) => entry.key === key)
}
