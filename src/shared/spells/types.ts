export interface KnownSpellView {
  catalogKey: string
  name: string
  effectType: string
  range: string
  /** Turns locked out after casting (not mana or spell slots). */
  cost: number
  tags: string[]
  constraintsHint: string | null
  rulesText: string
}

export const MAX_KNOWN_SPELLS_IN_CONTEXT = 8
