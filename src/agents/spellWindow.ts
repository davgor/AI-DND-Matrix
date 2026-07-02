import type { KnownSpellView } from '../shared/spells/types'
import { MAX_KNOWN_SPELLS_IN_CONTEXT } from '../shared/spells/types'

export interface KnownSpellContext {
  name: string
  cost: number
}

export function windowKnownSpellsForNarration(
  spells: KnownSpellView[],
  limit: number = MAX_KNOWN_SPELLS_IN_CONTEXT
): KnownSpellContext[] {
  return spells.slice(0, limit).map((spell) => ({ name: spell.name, cost: spell.cost }))
}

export function buildKnownSpellsPromptSection(spells: KnownSpellContext[]): string {
  if (spells.length === 0) {
    return ''
  }
  return [
    `Known spells for this character (player may reference these in actions; turn cost is turns locked out after casting): ${JSON.stringify(spells)}`,
    'Use spellGrants sparingly when training, finding grimoires, or story rewards — not every turn.'
  ].join('\n')
}
