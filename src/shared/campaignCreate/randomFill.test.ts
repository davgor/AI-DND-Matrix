import { describe, expect, it } from 'vitest'
import {
  MAX_ADDITIONAL_REGION_NPC_COUNT,
  MAX_NPCS_PER_REGION,
  MAX_REGION_COUNT,
  MIN_ADDITIONAL_REGION_NPC_COUNT,
  MIN_NPCS_PER_REGION,
  MIN_REGION_COUNT
} from './types'
import { validateCampaignSetupForm } from './validation'
import {
  createSeededRandomSource,
  randomAdditionalRegionNpcCount,
  randomCampaignName,
  randomCampaignSetupForm,
  randomDeathMode,
  randomNpcSeedPrompt,
  randomNpcsPerRegion,
  randomPremisePrompt,
  randomRegionCount,
  randomRegionSeedPrompt,
  randomRespawnLocation
} from './randomFill'

describe('randomFill text generators', () => {
  const seed = createSeededRandomSource(42)

  it('produces non-empty premise and region seed text from pools', () => {
    expect(randomPremisePrompt(seed).trim().length).toBeGreaterThan(20)
    expect(randomRegionSeedPrompt(seed).trim().length).toBeGreaterThan(10)
    expect(randomNpcSeedPrompt('Ironford', seed)).toContain('Ironford')
  })

  it('fills respawn location from a static pool', () => {
    expect(randomRespawnLocation(seed).length).toBeGreaterThan(0)
  })

  it('allows empty campaign names when the first roll is low', () => {
    expect(randomCampaignName({ next: () => 0.1 })).toBe('')
    expect(randomCampaignName({ next: () => 0.99 }).length).toBeGreaterThan(0)
  })

  it('is repeatable with a seeded random source', () => {
    const a = randomPremisePrompt(createSeededRandomSource(7))
    const b = randomPremisePrompt(createSeededRandomSource(7))
    expect(a).toBe(b)
  })
})

describe('randomFill mechanical generators', () => {
  it('keeps counts within shared bounds', () => {
    for (let i = 0; i < 20; i += 1) {
      const rng = createSeededRandomSource(100 + i)
      const regionCount = randomRegionCount(rng)
      const npcsPerRegion = randomNpcsPerRegion(rng)
      const additionalNpcCount = randomAdditionalRegionNpcCount(rng)
      expect(regionCount).toBeGreaterThanOrEqual(MIN_REGION_COUNT)
      expect(regionCount).toBeLessThanOrEqual(MAX_REGION_COUNT)
      expect(npcsPerRegion).toBeGreaterThanOrEqual(MIN_NPCS_PER_REGION)
      expect(npcsPerRegion).toBeLessThanOrEqual(MAX_NPCS_PER_REGION)
      expect(additionalNpcCount).toBeGreaterThanOrEqual(MIN_ADDITIONAL_REGION_NPC_COUNT)
      expect(additionalNpcCount).toBeLessThanOrEqual(MAX_ADDITIONAL_REGION_NPC_COUNT)
    }
  })

  it('covers each death mode via controlled random values', () => {
    expect(randomDeathMode({ next: () => 0 })).toBe('legendary')
    expect(randomDeathMode({ next: () => 0.4 })).toBe('standard')
    expect(randomDeathMode({ next: () => 0.8 })).toBe('respawn')
  })

  it('composed campaign form always passes validation', () => {
    for (let i = 0; i < 25; i += 1) {
      const form = randomCampaignSetupForm(createSeededRandomSource(900 + i))
      expect(validateCampaignSetupForm(form)).toBeNull()
      if (form.deathMode === 'respawn') {
        expect(form.respawnLocation.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
