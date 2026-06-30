import type { Archetype } from './hp'
import type { AppliedPerk, PerkProposal } from '../shared/progression/types'
import { applyPerkCategory } from './perkCategoryAppliers'

export const PERK_AC_STACK_CAP = 3
export const PERK_HP_BONUS = 2

export interface CharacterPerkStats {
  perkAcBonus?: number
  hasExtraAttack?: boolean
  knownSpellKeys?: string[]
  perkProficiencies?: string[]
  perks?: AppliedPerk[]
  customFeatures?: Array<{ effectDice: number; diceSize: number; name: string; description: string }>
  lastLevelUpXp?: number
  pendingLevelUpQueue?: unknown[]
  ac?: number
  maxHp?: number
}

export interface ApplyPerkInput {
  proposal: PerkProposal
  levelGained: number
  stats: Record<string, unknown>
  validateSpellKey: (key: string) => boolean
}

export interface ApplyPerkResult {
  stats: Record<string, unknown>
  applied: AppliedPerk
}

const SUMMARY_BY_CATEGORY: Record<PerkProposal['category'], (proposal: PerkProposal, stats: CharacterPerkStats) => string> = {
  ac_bonus: (_p, stats) => `AC +1 (total perk bonus: ${stats.perkAcBonus ?? 1})`,
  extra_attack: () => 'Extra attack each turn',
  spell_access: (p) => `Knows spell: ${p.catalogSpellKey ?? 'unknown'}`,
  hp_max_bonus: () => `+${PERK_HP_BONUS} max HP`,
  check_proficiency: (p) => `Proficient in ${p.proficiencyAbility ?? 'mind'} checks`,
  passive_feature: () => 'Custom passive feature',
  custom_feature: () => 'Custom passive feature'
}

function readPerkStats(stats: Record<string, unknown>): CharacterPerkStats {
  return stats as CharacterPerkStats
}

export function applyPerk(input: ApplyPerkInput): ApplyPerkResult {
  const stats = applyPerkCategory(input.proposal.category, {
    stats: readPerkStats({ ...input.stats }),
    proposal: input.proposal,
    levelGained: input.levelGained,
    validateSpellKey: input.validateSpellKey
  })
  const applied: AppliedPerk = {
    id: input.proposal.id,
    levelGained: input.levelGained,
    category: input.proposal.category,
    name: input.proposal.name,
    description: input.proposal.description,
    mechanicalSummary: SUMMARY_BY_CATEGORY[input.proposal.category](input.proposal, stats),
    grantedAt: new Date().toISOString()
  }
  return { stats: { ...input.stats, ...stats, perks: [...(stats.perks ?? []), applied] }, applied }
}

export function readPerkAcBonus(stats: Record<string, unknown>): number {
  return Math.min(readPerkStats(stats).perkAcBonus ?? 0, PERK_AC_STACK_CAP)
}

export function characterHasExtraAttack(stats: Record<string, unknown>): boolean {
  return readPerkStats(stats).hasExtraAttack === true
}

export function archetypeKitTags(archetype: string): string[] {
  const kits: Record<Archetype, string[]> = {
    fighter: ['melee', 'martial'],
    rogue: ['stealth', 'skirmish'],
    mage: ['arcane', 'spell'],
    cleric: ['divine', 'support'],
    ranger: ['ranged', 'wilderness']
  }
  return kits[archetype as Archetype] ?? ['adventurer']
}
