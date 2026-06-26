import type { DamageType } from './damage'

export interface FeatureTemplate {
  baseEffectDice: number
  diceSize: number
  perLevelDice: number
}

export interface FeatureFlavor {
  name: string
  description: string
  damageType: DamageType
}

export interface ComputedFeature extends FeatureFlavor {
  effectDice: number
  diceSize: number
}

export function computeFeatureFromTemplate(
  template: FeatureTemplate,
  level: number,
  flavor: FeatureFlavor
): ComputedFeature {
  return {
    ...flavor,
    effectDice: template.baseEffectDice + template.perLevelDice * Math.floor(level / 5),
    diceSize: template.diceSize
  }
}
