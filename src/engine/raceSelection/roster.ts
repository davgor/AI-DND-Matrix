import type { RaceRosterEntry } from '../../shared/raceSelection/types'

export const CUSTOM_RACE_KEY = 'custom'

export const RACE_ROSTER: RaceRosterEntry[] = [
  {
    key: 'human',
    label: 'Human',
    category: 'common_folk',
    seedPrompt: 'Adaptable, short-lived, ambitious; the most widespread and varied ancestry.'
  },
  {
    key: 'elf',
    label: 'Elf',
    category: 'common_folk',
    seedPrompt: 'Long-lived, graceful, magically attuned; deep ties to nature or high tradition.'
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
    seedPrompt: 'Stout, enduring mountain/underground folk; master smiths and stubborn traditionalists.'
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
    seedPrompt: 'Draconic humanoids with a breath weapon lineage, prideful and clan-honor driven.'
  },
  {
    key: 'genasi',
    label: 'Genasi / Elemental-touched',
    category: 'outsider_bloodlines',
    seedPrompt: 'Bearer of elemental heritage (fire, water, air, earth) with a manifest trait.'
  },
  {
    key: 'orc',
    label: 'Orc',
    category: 'monstrous_feral',
    seedPrompt: 'Strong, fierce, honor- or clan-bound warriors often cast as outsiders.'
  },
  {
    key: 'goliath',
    label: 'Goliath',
    category: 'monstrous_feral',
    seedPrompt: 'Towering, mountain-dwelling folk built for endurance and competition.'
  },
  {
    key: 'drow',
    label: 'Drow',
    category: 'monstrous_feral',
    seedPrompt: 'Subterranean dark elves from a harsh, insular, often matriarchal society.'
  },
  {
    key: 'lizardfolk',
    label: 'Lizardfolk',
    category: 'monstrous_feral',
    seedPrompt: 'Cold-blooded reptilian folk, pragmatic and survival-minded.'
  },
  {
    key: 'kobold',
    label: 'Kobold',
    category: 'monstrous_feral',
    seedPrompt: 'Small draconic-kin, communal, trap-clever, pack-minded.'
  },
  {
    key: 'beastfolk',
    label: 'Beastfolk',
    category: 'monstrous_feral',
    seedPrompt: 'Animal-featured humanoids (varied) shaped by instinct and kinship.'
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
    seedPrompt: 'Artificial, awakened being of metal or clay seeking place and purpose.'
  }
]

export function findRosterEntry(raceKey: string): RaceRosterEntry | undefined {
  return RACE_ROSTER.find((entry) => entry.key === raceKey)
}

export function isPresetRaceKey(raceKey: string): boolean {
  return findRosterEntry(raceKey) !== undefined
}
