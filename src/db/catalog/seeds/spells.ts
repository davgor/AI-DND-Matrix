import type { CreateCatalogSpellInput } from '../types'

/**
 * Spell/ability preseed dataset v1. Core coverage for early gameplay loops
 * across all five seed archetypes, with bucket tags applied where a
 * spell is thematically tied to an opposing creature family (e.g. holy
 * spells tagged against undead).
 */
export const SPELL_SEEDS_V1: CreateCatalogSpellInput[] = [
  {
    key: 'firebolt',
    name: 'Firebolt',
    effectType: 'damage',
    range: 'ranged',
    cost: 1,
    archetypeHint: 'mage',
    tags: ['fire', 'single-target'],
    buckets: ['elemental'],
    constraints: { requiresArchetype: ['mage'], minLevel: 1 },
    source: 'seed',
    version: 1
  },
  {
    key: 'arcane-bolt',
    name: 'Arcane Bolt',
    effectType: 'damage',
    range: 'ranged',
    cost: 1,
    archetypeHint: 'mage',
    tags: ['arcane', 'single-target'],
    buckets: ['humanoid'],
    constraints: { requiresArchetype: ['mage'], minLevel: 1 },
    source: 'seed',
    version: 1
  },
  {
    key: 'frost-shard',
    name: 'Frost Shard',
    effectType: 'damage',
    range: 'ranged',
    cost: 2,
    archetypeHint: 'mage',
    tags: ['cold', 'area'],
    buckets: ['elemental'],
    constraints: { requiresArchetype: ['mage'], minLevel: 3 },
    source: 'seed',
    version: 1
  },
  {
    key: 'turn-undead',
    name: 'Turn Undead',
    effectType: 'control',
    range: 'medium',
    cost: 2,
    archetypeHint: 'cleric',
    tags: ['holy', 'area'],
    buckets: ['undead'],
    constraints: { requiresArchetype: ['cleric'], minLevel: 2 },
    source: 'seed',
    version: 1
  },
  {
    key: 'minor-heal',
    name: 'Minor Heal',
    effectType: 'healing',
    range: 'touch',
    cost: 1,
    archetypeHint: 'cleric',
    tags: ['support'],
    buckets: ['humanoid'],
    constraints: { requiresArchetype: ['cleric'], minLevel: 1 },
    source: 'seed',
    version: 1
  },
  {
    key: 'smite-fiend',
    name: 'Smite Fiend',
    effectType: 'damage',
    range: 'melee',
    cost: 1,
    archetypeHint: 'cleric',
    tags: ['holy', 'single-target'],
    buckets: ['fiend'],
    constraints: { requiresArchetype: ['cleric'], minLevel: 2 },
    source: 'seed',
    version: 1
  },
  {
    key: 'sneak-strike',
    name: 'Sneak Strike',
    effectType: 'damage',
    range: 'melee',
    cost: 1,
    archetypeHint: 'rogue',
    tags: ['precision', 'single-target'],
    buckets: ['humanoid'],
    constraints: { requiresArchetype: ['rogue'], minLevel: 1 },
    source: 'seed',
    version: 1
  },
  {
    key: 'shadow-step',
    name: 'Shadow Step',
    effectType: 'utility',
    range: 'self',
    cost: 1,
    archetypeHint: 'rogue',
    tags: ['mobility'],
    buckets: ['humanoid'],
    constraints: { requiresArchetype: ['rogue'], minLevel: 2 },
    source: 'seed',
    version: 1
  },
  {
    key: 'rallying-strike',
    name: 'Rallying Strike',
    effectType: 'damage',
    range: 'melee',
    cost: 1,
    archetypeHint: 'fighter',
    tags: ['single-target', 'morale'],
    buckets: ['humanoid'],
    constraints: { requiresArchetype: ['fighter'], minLevel: 1 },
    source: 'seed',
    version: 1
  },
  {
    key: 'shield-bash',
    name: 'Shield Bash',
    effectType: 'control',
    range: 'melee',
    cost: 1,
    archetypeHint: 'fighter',
    tags: ['stun', 'single-target'],
    buckets: ['construct'],
    constraints: { requiresArchetype: ['fighter'], minLevel: 2 },
    source: 'seed',
    version: 1
  },
  {
    key: 'beast-bond-strike',
    name: "Beast Bond Strike",
    effectType: 'damage',
    range: 'ranged',
    cost: 1,
    archetypeHint: 'ranger',
    tags: ['single-target', 'precision'],
    buckets: ['beast'],
    constraints: { requiresArchetype: ['ranger'], minLevel: 1 },
    source: 'seed',
    version: 1
  },
  {
    key: 'hunters-mark',
    name: "Hunter's Mark",
    effectType: 'utility',
    range: 'ranged',
    cost: 1,
    archetypeHint: 'ranger',
    tags: ['tracking'],
    buckets: ['beast', 'dragonkin'],
    constraints: { requiresArchetype: ['ranger'], minLevel: 1 },
    source: 'seed',
    version: 1
  }
]
