import { describe, expect, it } from 'vitest'
import { fillSkeleton, formatLabeledBlocks } from '../skeletonFill'
import {
  isValidGeneratedFactions,
  normalizeGeneratedFactions
} from './normalize'
import {
  buildFactionsSkeletonJson,
  buildFactionsSkeletonPlan,
  resolveCreateFactionPressure
} from './factionsSkeleton'

describe('resolveCreateFactionPressure', () => {
  it('defaults to medium', () => {
    expect(resolveCreateFactionPressure('A desert caravan route under ash skies.')).toBe(
      'medium'
    )
  })

  it('biases heavy for court intrigue', () => {
    expect(resolveCreateFactionPressure('Court intrigue tears the empire apart.')).toBe('heavy')
  })

  it('biases light for pastoral premises', () => {
    expect(resolveCreateFactionPressure('A quiet village after a peaceful hamlet harvest.')).toBe(
      'light'
    )
  })
})

describe('buildFactionsSkeletonPlan', () => {
  it('includes a religious slot when deities are present (medium)', () => {
    const plan = buildFactionsSkeletonPlan('medium', true)
    expect(plan.factions.some((slot) => slot.kind === 'religious')).toBe(true)
    expect(plan.relations.length).toBeGreaterThanOrEqual(2)
    expect(buildFactionsSkeletonJson(plan)).toContain('FACTION_2_DEITY_NAME')
  })

  it('omits religious slots when no deities', () => {
    const plan = buildFactionsSkeletonPlan('medium', false)
    expect(plan.factions.every((slot) => slot.kind !== 'religious')).toBe(true)
  })
})

describe('factions skeleton fill medium path (161.3)', () => {
  it('fills medium skeleton and passes isValidGeneratedFactions', () => {
    const plan = buildFactionsSkeletonPlan('medium', true)
    const skeleton = buildFactionsSkeletonJson(plan)
    const blocks = formatLabeledBlocks({
      FACTIONS_SUMMARY:
        'Harbor councils and tide temples contest wreck rights while smuggler princes buy silence.',
      FACTION_0_NAME: 'Harbor Council',
      FACTION_0_SUMMARY: 'Port magistrates who tax moorings.',
      FACTION_1_NAME: 'Charting Compact',
      FACTION_1_SUMMARY: 'Beacon crews who sell safe-passage charts.',
      FACTION_2_NAME: 'Temple of Vhalor',
      FACTION_2_SUMMARY: 'Tide priests who judge oaths.',
      FACTION_2_DEITY_NAME: 'Vhalor',
      FACTION_3_NAME: 'Smuggler Princes',
      FACTION_3_SUMMARY: 'Captains who run dark lanes.',
      RELATION_0_SUMMARY: 'Dock seizures keep the feud warm.',
      RELATION_1_SUMMARY: 'Priests demand wreck tithes the council refuses.'
    })
    const filled = fillSkeleton(skeleton, blocks)
    expect(filled.ok).toBe(true)
    if (!filled.ok) {
      return
    }
    const parsed = JSON.parse(filled.jsonText) as unknown
    const normalized = normalizeGeneratedFactions(parsed, { deitiesPresent: true })
    expect(normalized).toBeDefined()
    expect(isValidGeneratedFactions(normalized, { deitiesPresent: true })).toBe(true)
    expect(normalized?.factions.some((faction) => faction.kind === 'religious')).toBe(true)
  })
})

describe('factions skeleton Eldergloom blocks (161.3)', () => {
  it('accepts Eldergloom-style labeled blocks (prior JSON failure modes as blocks)', () => {
    const plan = buildFactionsSkeletonPlan('medium', true)
    const skeleton = buildFactionsSkeletonJson(plan)
    const blocks = [
      'Sure, here are the factions:',
      formatLabeledBlocks({
        FACTIONS_SUMMARY:
          "The Storm Priests control the winds, while the Temple Guilds hoard the secrets of the gods, and the Merchant's Alliance seeks to navigate the shifting tides of trade and power.",
        FACTION_0_NAME: 'Storm Priests',
        FACTION_0_SUMMARY: 'Worshippers of Aeloria who command the winds and weather.',
        FACTION_1_NAME: "Merchant's Alliance",
        FACTION_1_SUMMARY:
          'A coalition of traders and merchants seeking to profit from the shifting seas.',
        FACTION_2_NAME: 'Temple Guilds',
        FACTION_2_SUMMARY:
          'Guardians of the lost wisdom of Eldergloom, serving Vhalor and other forgotten deities.',
        FACTION_2_DEITY_NAME: 'Vhalor',
        FACTION_3_NAME: 'Rune-Guild',
        FACTION_3_SUMMARY: 'Guild of rune-casters who navigate the mystical rivers.',
        RELATION_0_SUMMARY: 'Winds and secrets clash in a struggle for supremacy.',
        RELATION_1_SUMMARY: 'Priests and magistrates argue over wreck tithes.'
      }),
      'Hope that helps!'
    ].join('\n')
    const filled = fillSkeleton(skeleton, blocks)
    expect(filled.ok).toBe(true)
    if (!filled.ok) {
      return
    }
    const normalized = normalizeGeneratedFactions(JSON.parse(filled.jsonText), {
      deitiesPresent: true
    })
    expect(isValidGeneratedFactions(normalized, { deitiesPresent: true })).toBe(true)
  })
})
