import { describe, expect, it } from 'vitest'
import { computeFeatureFromTemplate, type FeatureFlavor, type FeatureTemplate } from './featureTemplate'

describe('computeFeatureFromTemplate', () => {
  const template: FeatureTemplate = { baseEffectDice: 2, diceSize: 6, perLevelDice: 1 }
  const flavor: FeatureFlavor = {
    name: 'Arcane Backlash',
    description: 'A burst of unstable arcane energy.',
    damageType: 'arcane'
  }

  it('scales effect dice deterministically across levels per the template', () => {
    expect(computeFeatureFromTemplate(template, 1, flavor).effectDice).toBe(2)
    expect(computeFeatureFromTemplate(template, 5, flavor).effectDice).toBe(3)
    expect(computeFeatureFromTemplate(template, 10, flavor).effectDice).toBe(4)
  })

  it('returns identical numbers for the same template and level', () => {
    const first = computeFeatureFromTemplate(template, 7, flavor)
    const second = computeFeatureFromTemplate(template, 7, flavor)
    expect(first).toEqual(second)
  })

  it('passes flavor text through without affecting the computed numbers', () => {
    const result = computeFeatureFromTemplate(template, 5, flavor)
    expect(result.name).toBe('Arcane Backlash')
    expect(result.damageType).toBe('arcane')
    expect(result.effectDice).toBe(3)
  })
})
