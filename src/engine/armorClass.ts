import { abilityModifier } from './abilities'

export type ArmorTier = 'none' | 'light' | 'medium' | 'heavy'

export const ARMOR_BONUS: Record<ArmorTier, number> = {
  none: 0,
  light: 2,
  medium: 4,
  heavy: 6
}

export function computeAC(agilityScore: number, armorTier: ArmorTier): number {
  return computeTotalAC({ agilityScore, armorTier })
}

export function computeTotalAC(input: {
  agilityScore: number
  armorTier: ArmorTier
  shieldBonus?: number
  accessoryAcBonus?: number
}): number {
  const shield = input.shieldBonus ?? 0
  const accessory = input.accessoryAcBonus ?? 0
  return 10 + abilityModifier(input.agilityScore) + ARMOR_BONUS[input.armorTier] + shield + accessory
}
