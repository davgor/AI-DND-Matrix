import type { RandomFn } from './abilities'
import { applyResistance, resolveDamage, type ResistanceProfile } from './damage'
import type {
  DamageBreakdown,
  DamageComponent,
  DamageComponentResult
} from '../shared/weaponModifications/types'

export function resolveWeaponDamage(
  components: DamageComponent[],
  rng: RandomFn,
  isCritical: boolean
): DamageBreakdown {
  const results: DamageComponentResult[] = components.map((component) => {
    const rolled = resolveDamage(component.damageRoll, rng, isCritical)
    return { type: component.damageType, rolled, afterResistance: rolled }
  })
  return { components: results, total: sumAfterResistance(results) }
}

export function resolveWeaponDamageAgainstProfile(
  components: DamageComponent[],
  rng: RandomFn,
  isCritical: boolean,
  resistanceProfile: ResistanceProfile
): DamageBreakdown {
  const results: DamageComponentResult[] = components.map((component) => {
    const rolled = resolveDamage(component.damageRoll, rng, isCritical)
    const afterResistance = applyResistance(rolled, component.damageType, resistanceProfile)
    return { type: component.damageType, rolled, afterResistance }
  })
  return { components: results, total: sumAfterResistance(results) }
}

function sumAfterResistance(results: DamageComponentResult[]): number {
  return results.reduce((sum, row) => sum + row.afterResistance, 0)
}
