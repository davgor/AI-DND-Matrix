import type { KnownSpellView } from '../shared/spells/types'

export interface CatalogSpellConstraints {
  requiresArchetype?: string[]
  minLevel?: number
}

export interface CatalogSpellLookupRow {
  key: string
  name: string
  effectType: string
  range: string
  cost: number
  tags: string[]
  constraints: CatalogSpellConstraints
}

function formatConstraintsHint(constraints: CatalogSpellConstraints): string | null {
  const parts: string[] = []
  if (constraints.requiresArchetype?.length) {
    const labels = constraints.requiresArchetype.map(
      (archetype) => archetype.charAt(0).toUpperCase() + archetype.slice(1)
    )
    parts.push(labels.join(' / '))
  }
  if (typeof constraints.minLevel === 'number') {
    parts.push(`level ${constraints.minLevel}+`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

function buildRulesText(spell: CatalogSpellLookupRow): string {
  const costLabel = spell.cost === 1 ? '1 turn' : `${spell.cost} turns`
  return `${spell.effectType} at ${spell.range} range. Costs ${costLabel} locked out after casting.`
}

export function resolveKnownSpells(
  keys: string[],
  lookup: (key: string) => CatalogSpellLookupRow | undefined
): KnownSpellView[] {
  const uniqueKeys = [...new Set(keys)]
  const resolved = uniqueKeys
    .map((key) => {
      const spell = lookup(key)
      if (!spell) {
        return null
      }
      return {
        catalogKey: spell.key,
        name: spell.name,
        effectType: spell.effectType,
        range: spell.range,
        cost: spell.cost,
        tags: spell.tags,
        constraintsHint: formatConstraintsHint(spell.constraints),
        rulesText: buildRulesText(spell)
      }
    })
    .filter((entry): entry is KnownSpellView => entry !== null)

  return resolved.sort((a, b) => a.name.localeCompare(b.name))
}

export function appendKnownSpellKeys(
  keys: string[],
  additions: string[],
  validateSpellKey: (key: string) => boolean
): string[] {
  const next = [...keys]
  for (const key of additions) {
    if (!validateSpellKey(key) || next.includes(key)) {
      continue
    }
    next.push(key)
  }
  return next
}
