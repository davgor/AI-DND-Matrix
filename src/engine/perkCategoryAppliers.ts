import type { CharacterPerkStats } from './perks'
import type { PerkProposal } from '../shared/progression/types'
import { isCheckProficiencyAbility } from '../shared/progression/types'
import { computeFeatureFromTemplate, type FeatureFlavor } from './featureTemplate'
import { PERK_AC_STACK_CAP } from './perks'

const PASSIVE_TEMPLATE = { baseEffectDice: 1, diceSize: 6, perLevelDice: 1 }

type CategoryApplier = (input: {
  stats: CharacterPerkStats
  proposal: PerkProposal
  levelGained: number
  validateSpellKey: (key: string) => boolean
}) => CharacterPerkStats

const CATEGORY_APPLIERS: Record<PerkProposal['category'], CategoryApplier> = {
  ac_bonus: ({ stats }) => {
    const current = stats.perkAcBonus ?? 0
    if (current >= PERK_AC_STACK_CAP) return stats
    const next = { ...stats, perkAcBonus: current + 1 }
    if (typeof stats.ac === 'number') next.ac = stats.ac + 1
    return next
  },
  extra_attack: ({ stats }) => ({ ...stats, hasExtraAttack: true }),
  spell_access: ({ stats, proposal, validateSpellKey }) => {
    const key = proposal.catalogSpellKey
    if (!key || !validateSpellKey(key)) throw new Error(`Invalid catalog spell key: ${key ?? '(missing)'}`)
    return { ...stats, knownSpellKeys: [...new Set([...(stats.knownSpellKeys ?? []), key])] }
  },
  hp_max_bonus: ({ stats }) => stats,
  check_proficiency: ({ stats, proposal }) => {
    const ability = proposal.proficiencyAbility
    if (!ability || !isCheckProficiencyAbility(ability)) throw new Error('check_proficiency requires proficiencyAbility')
    return { ...stats, perkProficiencies: [...new Set([...(stats.perkProficiencies ?? []), ability])] }
  },
  passive_feature: applyFeatureCategory,
  custom_feature: applyFeatureCategory
}

function applyFeatureCategory(input: {
  stats: CharacterPerkStats
  proposal: PerkProposal
  levelGained: number
}): CharacterPerkStats {
  const flavor: FeatureFlavor = {
    name: input.proposal.name,
    description: input.proposal.description,
    damageType: input.proposal.flavorTags.includes('arcane') ? 'Arcane' : 'Physical'
  }
  const computed = computeFeatureFromTemplate(PASSIVE_TEMPLATE, input.levelGained, flavor)
  return { ...input.stats, customFeatures: [...(input.stats.customFeatures ?? []), computed] }
}

export function applyPerkCategory(
  category: PerkProposal['category'],
  input: {
    stats: CharacterPerkStats
    proposal: PerkProposal
    levelGained: number
    validateSpellKey: (key: string) => boolean
  }
): CharacterPerkStats {
  return CATEGORY_APPLIERS[category](input)
}
