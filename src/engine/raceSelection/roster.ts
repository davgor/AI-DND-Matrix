import type { RaceRosterEntry } from '../../shared/raceSelection/types'

export const CUSTOM_RACE_KEY = 'custom'

export const RACE_ROSTER: RaceRosterEntry[] = [
  {
    key: 'human',
    label: 'Human',
    category: 'common_folk',
    seedPrompt: 'Adaptable, short-lived, and ambitious; the most widespread and varied ancestry.'
  },
  {
    key: 'elf',
    label: 'Elf',
    category: 'common_folk',
    seedPrompt: 'Long-lived and graceful, often skilled with magic; deep ties to nature or high tradition.'
  },
  {
    key: 'half_elf',
    label: 'Half-Elf',
    category: 'common_folk',
    seedPrompt: 'Born of human and elf; caught between two worlds, charismatic and versatile.'
  },
  {
    key: 'dwarf',
    label: 'Dwarf',
    category: 'common_folk',
    seedPrompt: 'Stout folk of the mountains or underground; master smiths and stubborn traditionalists.'
  },
  {
    key: 'halfling',
    label: 'Halfling',
    category: 'common_folk',
    seedPrompt: 'Small, nimble, home-loving and lucky; unassuming survivors.'
  },
  {
    key: 'gnome',
    label: 'Gnome',
    category: 'common_folk',
    seedPrompt: 'Small, inventive, curious tinkerers and illusionists with long lives.'
  },
  {
    key: 'half_orc',
    label: 'Half-Orc',
    category: 'outsider_bloodlines',
    seedPrompt: 'Born of human and orc; powerful, resilient, fighting for acceptance.'
  },
  {
    key: 'tiefling',
    label: 'Tiefling',
    category: 'outsider_bloodlines',
    seedPrompt: 'Marked by an infernal or otherworldly bloodline; distrusted, resilient outsiders.'
  },
  {
    key: 'aasimar',
    label: 'Aasimar',
    category: 'outsider_bloodlines',
    seedPrompt: 'Touched by celestial power; radiant, burdened by expectation.'
  },
  {
    key: 'dragonborn',
    label: 'Dragonborn',
    category: 'outsider_bloodlines',
    seedPrompt: 'Humanoids with dragon ancestry and a breath weapon; prideful and driven by clan honor.'
  },
  {
    key: 'genasi',
    label: 'Genasi / Elemental-touched',
    category: 'outsider_bloodlines',
    seedPrompt: 'People with elemental heritage (fire, water, air, or earth) and a visible trait of that element.'
  },
  {
    key: 'orc',
    label: 'Orc',
    category: 'monstrous_feral',
    seedPrompt: 'Strong, fierce warriors bound by honor or clan, often cast as outsiders.'
  },
  {
    key: 'goliath',
    label: 'Goliath',
    category: 'monstrous_feral',
    seedPrompt: 'Towering folk of the mountains, built for endurance and competition.'
  },
  {
    key: 'drow',
    label: 'Drow',
    category: 'monstrous_feral',
    seedPrompt: 'Dark elves from underground societies that are harsh, insular, and often matriarchal.'
  },
  {
    key: 'lizardfolk',
    label: 'Lizardfolk',
    category: 'monstrous_feral',
    seedPrompt: 'Cold-blooded reptilian folk; pragmatic and focused on survival.'
  },
  {
    key: 'kobold',
    label: 'Kobold',
    category: 'monstrous_feral',
    seedPrompt: 'Small folk with dragon ancestry; communal, clever with traps, and loyal to their pack.'
  },
  {
    key: 'beastfolk',
    label: 'Beastfolk',
    category: 'monstrous_feral',
    seedPrompt: 'Humanoids with animal features (varied), shaped by instinct and kinship.'
  },
  {
    key: 'fae',
    label: 'Fae / Fairy',
    category: 'uncanny_otherworldly',
    seedPrompt: 'Small fey creatures of whimsy and old magic, bound to bargains and the wilds.'
  },
  {
    key: 'revenant',
    label: 'Undead / Revenant',
    category: 'uncanny_otherworldly',
    seedPrompt: 'Returned from death; driven by unfinished purpose, apart from the living.'
  },
  {
    key: 'automaton',
    label: 'Automaton / Construct',
    category: 'uncanny_otherworldly',
    seedPrompt: 'An artificial being of metal or clay that has awakened and seeks a place and purpose.'
  }
]

export function findRosterEntry(raceKey: string): RaceRosterEntry | undefined {
  return RACE_ROSTER.find((entry) => entry.key === raceKey)
}

export function isPresetRaceKey(raceKey: string): boolean {
  return findRosterEntry(raceKey) !== undefined
}
