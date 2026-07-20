import { describe, expect, it } from 'vitest'
import {
  BESTIARY_GENERATION_POINTS,
  BESTIARY_VARIANT_KEYS,
  ENCOUNTER_START_PRECEDENCE,
  isBestiaryGenerationPoint,
  isBestiaryVariantKey,
  isCompositionPlan,
  isCompositionSlot,
  isEncounterStartStep,
  isSpawnOutcome,
  parseBestiaryGenerationPoint,
  parseBestiaryVariantKey,
  parseCompositionPlan,
  parseCompositionSlot,
  parseSpawnOutcome,
  type BestiarySpecies,
  type BestiaryVariant,
  type CompositionPlan,
  type SpawnOutcome
} from './types'

describe('bestiary generation points', () => {
  it('exposes the three generation points', () => {
    expect(BESTIARY_GENERATION_POINTS).toEqual(['prepped', 'on_quest', 'on_demand'])
  })

  it('isBestiaryGenerationPoint accepts valid points', () => {
    expect(isBestiaryGenerationPoint('prepped')).toBe(true)
    expect(isBestiaryGenerationPoint('on_quest')).toBe(true)
    expect(isBestiaryGenerationPoint('on_demand')).toBe(true)
  })

  it('isBestiaryGenerationPoint rejects unknown values', () => {
    expect(isBestiaryGenerationPoint('quest_prep')).toBe(false)
    expect(isBestiaryGenerationPoint(1)).toBe(false)
  })

  it('parseBestiaryGenerationPoint round-trips strings', () => {
    expect(parseBestiaryGenerationPoint('on_quest')).toBe('on_quest')
    expect(parseBestiaryGenerationPoint('nope')).toBeUndefined()
  })
})

describe('bestiary variant keys', () => {
  it('includes standard, elevated, and thematic variants', () => {
    expect(BESTIARY_VARIANT_KEYS).toEqual([
      'standard',
      'alpha',
      'elite',
      'cursed',
      'mutated',
      'pack_runt'
    ])
  })

  it('isBestiaryVariantKey accepts known keys', () => {
    expect(isBestiaryVariantKey('alpha')).toBe(true)
    expect(isBestiaryVariantKey('cursed')).toBe(true)
  })

  it('isBestiaryVariantKey rejects unknown keys', () => {
    expect(isBestiaryVariantKey('boss')).toBe(false)
    expect(isBestiaryVariantKey(null)).toBe(false)
  })

  it('parseBestiaryVariantKey round-trips', () => {
    expect(parseBestiaryVariantKey('pack_runt')).toBe('pack_runt')
    expect(parseBestiaryVariantKey('')).toBeUndefined()
  })
})

describe('encounter start precedence', () => {
  it('orders quest prep before region hostiles before on-demand', () => {
    expect(ENCOUNTER_START_PRECEDENCE).toEqual([
      'explicit_participants',
      'quest_prep',
      'region_hostiles',
      'on_demand'
    ])
  })

  it('isEncounterStartStep guards the ordered steps', () => {
    expect(isEncounterStartStep('quest_prep')).toBe(true)
    expect(isEncounterStartStep('prepped')).toBe(false)
  })
})

const ALPHA_PACK: CompositionPlan = {
  slots: [
    { speciesKey: 'wolf', variantKey: 'standard', count: 5 },
    { speciesKey: 'wolf', variantKey: 'alpha', count: 1 }
  ],
  budgetSpent: 8,
  budgetMax: 10,
  thematicSignal: 'road_ambush'
}

const CURSED_PACK: CompositionPlan = {
  slots: [{ speciesKey: 'wolf', variantKey: 'cursed', count: 3 }],
  budgetSpent: 9,
  budgetMax: 10,
  thematicSignal: 'blighted_land'
}

describe('composition slots', () => {
  it('isCompositionSlot accepts well-formed slots', () => {
    expect(isCompositionSlot(ALPHA_PACK.slots[0])).toBe(true)
  })

  it('isCompositionSlot rejects bad counts or variant keys', () => {
    expect(isCompositionSlot({ speciesKey: 'wolf', variantKey: 'boss', count: 1 })).toBe(false)
    expect(isCompositionSlot({ speciesKey: 'wolf', variantKey: 'standard', count: 0 })).toBe(false)
    expect(isCompositionSlot({ speciesKey: '', variantKey: 'standard', count: 1 })).toBe(false)
  })

  it('parseCompositionSlot round-trips', () => {
    expect(parseCompositionSlot({ speciesKey: 'slime', variantKey: 'elite', count: 2 })).toEqual({
      speciesKey: 'slime',
      variantKey: 'elite',
      count: 2
    })
    expect(parseCompositionSlot({ speciesKey: 'slime', variantKey: 'elite', count: -1 })).toBeUndefined()
  })
})

describe('composition plans', () => {
  it('isCompositionPlan accepts alpha and cursed pack examples', () => {
    expect(isCompositionPlan(ALPHA_PACK)).toBe(true)
    expect(isCompositionPlan(CURSED_PACK)).toBe(true)
  })

  it('isCompositionPlan rejects overspend and empty slots', () => {
    expect(
      isCompositionPlan({
        slots: [{ speciesKey: 'wolf', variantKey: 'standard', count: 1 }],
        budgetSpent: 12,
        budgetMax: 10
      })
    ).toBe(false)
    expect(isCompositionPlan({ slots: [], budgetSpent: 0, budgetMax: 10 })).toBe(false)
  })

  it('parseCompositionPlan round-trips thematic signal', () => {
    expect(parseCompositionPlan(CURSED_PACK)).toEqual(CURSED_PACK)
    expect(parseCompositionPlan({ slots: 'nope', budgetSpent: 1, budgetMax: 2 })).toBeUndefined()
  })
})

describe('spawn outcomes', () => {
  const success: SpawnOutcome = {
    kind: 'success',
    instanceNpcIds: ['npc-1', 'npc-2']
  }
  const provisional: SpawnOutcome = {
    kind: 'fallback_provisional',
    instanceNpcIds: ['npc-provisional']
  }
  const failed: SpawnOutcome = {
    kind: 'failed',
    reason: 'no_species_available'
  }

  it('isSpawnOutcome accepts success, provisional, and failed', () => {
    expect(isSpawnOutcome(success)).toBe(true)
    expect(isSpawnOutcome(provisional)).toBe(true)
    expect(isSpawnOutcome(failed)).toBe(true)
  })

  it('isSpawnOutcome rejects malformed payloads', () => {
    expect(isSpawnOutcome({ kind: 'success', instanceNpcIds: [] })).toBe(false)
    expect(isSpawnOutcome({ kind: 'failed' })).toBe(false)
    expect(isSpawnOutcome({ kind: 'unknown' })).toBe(false)
  })

  it('parseSpawnOutcome round-trips each kind', () => {
    expect(parseSpawnOutcome(success)).toEqual(success)
    expect(parseSpawnOutcome(provisional)).toEqual(provisional)
    expect(parseSpawnOutcome(failed)).toEqual(failed)
    expect(parseSpawnOutcome(null)).toBeUndefined()
  })
})

describe('species and variant DTO shapes', () => {
  it('BestiarySpecies carries lore, buckets, and catalog key without combat numbers', () => {
    const species: BestiarySpecies = {
      id: 'sp-1',
      campaignId: 'camp-1',
      key: 'rift-beast',
      name: 'Rift-beast',
      baseLore: 'Born where the veil thins.',
      buckets: ['beast'],
      tags: ['rift'],
      defaultCatalogKey: 'dire-wolf',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
    expect(species.defaultCatalogKey).toBe('dire-wolf')
    expect('hp' in species).toBe(false)
  })

  it('BestiaryVariant may override catalog key and modifier profile', () => {
    const variant: BestiaryVariant = {
      variantKey: 'alpha',
      catalogKeyOverride: 'dire-wolf',
      modifierProfileId: 'elevated_alpha',
      flavorBlurb: 'Leads the pack from the front.'
    }
    expect(variant.variantKey).toBe('alpha')
    expect(variant.modifierProfileId).toBe('elevated_alpha')
  })
})
