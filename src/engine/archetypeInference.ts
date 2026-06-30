import type { Archetype } from './hp'

const ROLE_ARCHETYPE_KEYWORDS: Array<[string, Archetype]> = [
  ['guard', 'fighter'],
  ['soldier', 'fighter'],
  ['warrior', 'fighter'],
  ['knight', 'fighter'],
  ['fighter', 'fighter'],
  ['thief', 'rogue'],
  ['shopkeeper', 'rogue'],
  ['merchant', 'rogue'],
  ['rogue', 'rogue'],
  ['scout', 'ranger'],
  ['hunter', 'ranger'],
  ['ranger', 'ranger'],
  ['priest', 'cleric'],
  ['healer', 'cleric'],
  ['cleric', 'cleric'],
  ['scholar', 'mage'],
  ['wizard', 'mage'],
  ['sage', 'mage'],
  ['mage', 'mage']
]
const DEFAULT_ARCHETYPE: Archetype = 'fighter'

export function inferArchetypeFromClassOrRole(text: string): Archetype {
  const normalized = text.toLowerCase()
  const match = ROLE_ARCHETYPE_KEYWORDS.find(([keyword]) => normalized.includes(keyword))
  return match ? match[1] : DEFAULT_ARCHETYPE
}
