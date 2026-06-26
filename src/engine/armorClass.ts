import { abilityModifier } from './abilities'

export type ArmorTier = 'none' | 'light' | 'medium' | 'heavy'

export const ARMOR_BONUS: Record<ArmorTier, number> = {
  none: 0,
  light: 2,
  medium: 4,
  heavy: 6
}

export function computeAC(agilityScore: number, armorTier: ArmorTier): number {
  return 10 + abilityModifier(agilityScore) + ARMOR_BONUS[armorTier]
}
