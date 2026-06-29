import type { DamageRoll } from './damage'
import { isNaturalTwenty, resolveDamage } from './damage'

export function resolvePlayerAttackDamage(
  weaponRoll: DamageRoll,
  rng: () => number,
  attackRoll: number
): number {
  return resolveDamage(weaponRoll, rng, isNaturalTwenty(attackRoll))
}
