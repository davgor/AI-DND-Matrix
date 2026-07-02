import type { Archetype } from '../hp'

export const STARTING_OFF_HAND_EMPTY = '__empty__' as const
export type StartingOffHandToken = typeof STARTING_OFF_HAND_EMPTY | string

export interface StartingLoadoutPackage {
  archetype: Archetype
  weapons: readonly string[]
  armors: readonly string[]
  offHand: readonly StartingOffHandToken[]
  spellPickCount: number
  spellKeys: readonly string[]
}

export const STARTING_LOADOUT_PACKAGES: Record<Archetype, StartingLoadoutPackage> = {
  fighter: {
    archetype: 'fighter',
    weapons: ['Longsword', 'Handaxe', 'Greataxe'],
    armors: ['Chain Hauberk', "Traveler's Leathers", 'Unarmored Garb'],
    offHand: ['Wooden Shield', 'Handaxe', STARTING_OFF_HAND_EMPTY],
    spellPickCount: 1,
    spellKeys: ['rallying-strike', 'pressing-assault', 'iron-stance', 'hamstring', 'war-cry']
  },
  rogue: {
    archetype: 'rogue',
    weapons: ['Dagger', 'Shortsword', 'Handaxe'],
    armors: ["Traveler's Leathers", 'Unarmored Garb'],
    offHand: ['Dagger', STARTING_OFF_HAND_EMPTY],
    spellPickCount: 1,
    spellKeys: ['sneak-strike', 'venom-stab', 'blur-step', 'dirt-in-eyes', 'cheap-shot']
  },
  mage: {
    archetype: 'mage',
    weapons: ['Dagger', 'Handaxe'],
    armors: ["Traveler's Leathers", 'Unarmored Garb'],
    offHand: [],
    spellPickCount: 2,
    spellKeys: ['firebolt', 'arcane-bolt', 'magic-missile', 'shocking-grasp', 'mage-armor', 'ray-of-frost']
  },
  cleric: {
    archetype: 'cleric',
    weapons: ['Handaxe', 'Mace'],
    armors: ['Chain Hauberk', "Traveler's Leathers"],
    offHand: ['Wooden Shield', STARTING_OFF_HAND_EMPTY],
    spellPickCount: 2,
    spellKeys: ['minor-heal', 'sacred-flame', 'bless', 'bane', 'shield-of-faith', 'guiding-bolt']
  },
  ranger: {
    archetype: 'ranger',
    weapons: ['Hunting Bow', 'Shortsword', 'Handaxe'],
    armors: ["Traveler's Leathers", 'Unarmored Garb'],
    offHand: [],
    spellPickCount: 2,
    spellKeys: [
      'beast-bond-strike',
      'hunters-mark',
      'ensnaring-shot',
      'thorn-volley',
      'pass-without-trace',
      'volley'
    ]
  }
}

export const ARCHETYPES_WITH_LOADOUT: Archetype[] = [
  'fighter',
  'rogue',
  'mage',
  'cleric',
  'ranger'
]

export function getStartingLoadoutPackage(archetype: Archetype): StartingLoadoutPackage {
  return STARTING_LOADOUT_PACKAGES[archetype]
}
