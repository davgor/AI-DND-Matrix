export interface SpellDisplayFields {
  effectType: string
  range: string
  cost: number
  tags: string[]
}

const DAMAGE_TYPE_TAGS = new Set([
  'fire',
  'cold',
  'lightning',
  'holy',
  'poison',
  'arcane',
  'necrotic',
  'nature',
  'physical'
])

const META_TAGS = new Set(['single-target', 'area', 'precision'])

function labelizeTag(tag: string): string {
  return tag.replace(/-/g, ' ')
}

export function formatSpellCost(cost: number): string {
  return cost === 1 ? '1 turn' : `${cost} turns`
}

function damageSummary(spell: SpellDisplayFields): string | null {
  if (spell.effectType !== 'damage') {
    return null
  }
  const damageTags = spell.tags.filter((tag) => DAMAGE_TYPE_TAGS.has(tag) || tag === 'precision')
  if (damageTags.length > 0) {
    return `Damage: ${damageTags.map(labelizeTag).join(', ')}`
  }
  return 'Damage'
}

function taggedEffectLine(prefix: string, tags: string[], fallback: string): string {
  return `${prefix}: ${tags.length > 0 ? tags.map(labelizeTag).join(', ') : fallback}`
}

function secondaryEffects(spell: SpellDisplayFields): string | null {
  const extraTags = spell.tags.filter((tag) => !META_TAGS.has(tag))

  if (spell.effectType === 'healing') {
    return 'Effect: restores hit points'
  }
  if (spell.effectType === 'damage') {
    const alsoTags = extraTags.filter((tag) => !DAMAGE_TYPE_TAGS.has(tag))
    return alsoTags.length > 0 ? `Also: ${alsoTags.map(labelizeTag).join(', ')}` : null
  }

  const effectLabels: Record<string, [string, string]> = {
    buff: ['Buff', 'support'],
    debuff: ['Debuff', 'hindrance'],
    control: ['Control', 'restraint'],
    utility: ['Utility', 'misc']
  }
  const label = effectLabels[spell.effectType]
  if (label) {
    return taggedEffectLine(label[0], extraTags, label[1])
  }
  if (spell.effectType) {
    return `Effect: ${spell.effectType.charAt(0).toUpperCase()}${spell.effectType.slice(1)}`
  }
  return null
}

export function formatSpellTooltip(spell: SpellDisplayFields): string[] {
  const lines: string[] = []
  const damage = damageSummary(spell)
  if (damage) {
    lines.push(damage)
  }
  const effects = secondaryEffects(spell)
  if (effects && effects !== damage) {
    lines.push(effects)
  }
  if (lines.length === 0) {
    lines.push(spell.effectType.charAt(0).toUpperCase() + spell.effectType.slice(1))
  }
  lines.push(`${spell.range.charAt(0).toUpperCase()}${spell.range.slice(1)} range`)
  lines.push(`Cost: ${formatSpellCost(spell.cost)} lockout after cast`)
  return lines
}
