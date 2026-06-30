import type { PerkProposal } from './types'
import { isCheckProficiencyAbility, isPerkCategory } from './types'

function hasStringFields(p: Record<string, unknown>): boolean {
  return typeof p.id === 'string' && typeof p.name === 'string' && typeof p.description === 'string'
}

function hasFlavorTags(p: Record<string, unknown>): boolean {
  return Array.isArray(p.flavorTags) && p.flavorTags.every((t) => typeof t === 'string')
}

export function parsePerkProposal(value: unknown): PerkProposal | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const p = value as Record<string, unknown>
  if (!hasStringFields(p) || !isPerkCategory(p.category) || !hasFlavorTags(p)) {
    return null
  }
  const proposal: PerkProposal = {
    id: p.id as string,
    name: p.name as string,
    description: p.description as string,
    category: p.category,
    flavorTags: p.flavorTags as string[]
  }
  if (typeof p.catalogSpellKey === 'string') {
    proposal.catalogSpellKey = p.catalogSpellKey
  } else if (p.catalogSpellKey !== undefined) {
    return null
  }
  if (p.proficiencyAbility !== undefined) {
    if (!isCheckProficiencyAbility(p.proficiencyAbility)) {
      return null
    }
    proposal.proficiencyAbility = p.proficiencyAbility
  }
  return proposal
}
