import { describe, expect, it } from 'vitest'
import {
  FACTION_DIGEST_ENRICHED_MAX_LINES,
  FACTION_DIGEST_LINE_MAX_CHARS,
  FACTION_DIGEST_SLIM_MAX_LINES,
  FACTION_KINDS,
  FACTION_PRESSURE_BANDS,
  FACTION_PRESSURES,
  FACTION_RELATION_DIGEST_ENRICHED_MAX,
  FACTION_RELATION_DIGEST_SLIM_MAX,
  FACTION_RELATION_STANCES,
  FACTION_REPUTATION_DIGEST_MAX,
  FACTION_SOURCES,
  REPUTATION_BANDS,
  REPUTATION_DELTA_MAX_ABS,
  REPUTATION_SCORE_MAX,
  REPUTATION_SCORE_MIN,
  applyReputationDelta,
  bandForReputationScore,
  canonicalFactionPair,
  clampReputationDelta,
  clampReputationScore,
  isFactionKind,
  isFactionPressure,
  isFactionRelationStance,
  isFactionSource,
  isReputationBand,
  parseFactionKind,
  parseFactionPressure,
  parseFactionRelationStance,
  parseReputationBand,
  pressureAllowsRosterCount,
  shouldEnrichFactionDigest
} from './types'

describe('faction kinds', () => {
  it('locks the seven v1 kinds including religious', () => {
    expect(FACTION_KINDS).toEqual([
      'civic',
      'military',
      'mercantile',
      'criminal',
      'clandestine',
      'political',
      'religious'
    ])
  })

  it('isFactionKind / parseFactionKind round-trip', () => {
    expect(isFactionKind('religious')).toBe(true)
    expect(isFactionKind('cult')).toBe(false)
    expect(parseFactionKind('political')).toBe('political')
    expect(parseFactionKind('')).toBeUndefined()
  })
})

describe('faction pressure bands', () => {
  it('exposes light medium heavy', () => {
    expect(FACTION_PRESSURES).toEqual(['light', 'medium', 'heavy'])
  })

  it('locks roster and relation bands from SPEC', () => {
    expect(FACTION_PRESSURE_BANDS.light).toEqual({
      minFactions: 2,
      maxFactions: 4,
      minRelations: 0,
      maxRelations: 2
    })
    expect(FACTION_PRESSURE_BANDS.medium).toEqual({
      minFactions: 3,
      maxFactions: 7,
      minRelations: 2,
      maxRelations: 5
    })
    expect(FACTION_PRESSURE_BANDS.heavy).toEqual({
      minFactions: 6,
      maxFactions: 10,
      minRelations: 4,
      maxRelations: 10
    })
  })

  it('pressureAllowsRosterCount respects inclusive bands', () => {
    expect(pressureAllowsRosterCount('light', 2)).toBe(true)
    expect(pressureAllowsRosterCount('light', 5)).toBe(false)
    expect(pressureAllowsRosterCount('heavy', 6)).toBe(true)
    expect(pressureAllowsRosterCount('heavy', 5)).toBe(false)
  })

  it('parseFactionPressure rejects unknown', () => {
    expect(isFactionPressure('medium')).toBe(true)
    expect(parseFactionPressure('extreme')).toBeUndefined()
  })
})

describe('relation stances', () => {
  it('locks ally rival tense secret war', () => {
    expect(FACTION_RELATION_STANCES).toEqual(['ally', 'rival', 'tense', 'secret', 'war'])
  })

  it('parseFactionRelationStance works', () => {
    expect(isFactionRelationStance('war')).toBe(true)
    expect(parseFactionRelationStance('peace')).toBeUndefined()
  })

  it('canonicalFactionPair orders ids lexicographically', () => {
    expect(canonicalFactionPair('b', 'a')).toEqual({ factionAId: 'a', factionBId: 'b' })
    expect(canonicalFactionPair('a', 'a')).toBeUndefined()
  })
})

describe('faction sources', () => {
  it('locks campaign_create and dm_play', () => {
    expect(FACTION_SOURCES).toEqual(['campaign_create', 'dm_play'])
    expect(isFactionSource('dm_play')).toBe(true)
    expect(isFactionSource('import')).toBe(false)
  })
})

describe('reputation clamps and bands', () => {
  it('locks score range and per-update delta cap', () => {
    expect(REPUTATION_SCORE_MIN).toBe(-100)
    expect(REPUTATION_SCORE_MAX).toBe(100)
    expect(REPUTATION_DELTA_MAX_ABS).toBe(25)
  })

  it('exposes five reputation bands', () => {
    expect(REPUTATION_BANDS).toEqual([
      'hostile',
      'unfriendly',
      'neutral',
      'friendly',
      'allied'
    ])
  })

  it('bandForReputationScore matches SPEC thresholds', () => {
    expect(bandForReputationScore(-100)).toBe('hostile')
    expect(bandForReputationScore(-51)).toBe('hostile')
    expect(bandForReputationScore(-50)).toBe('unfriendly')
    expect(bandForReputationScore(-21)).toBe('unfriendly')
    expect(bandForReputationScore(-20)).toBe('neutral')
    expect(bandForReputationScore(20)).toBe('neutral')
    expect(bandForReputationScore(21)).toBe('friendly')
    expect(bandForReputationScore(50)).toBe('friendly')
    expect(bandForReputationScore(51)).toBe('allied')
    expect(bandForReputationScore(100)).toBe('allied')
  })

  it('clampReputationDelta prevents hostile→allied in one beat', () => {
    expect(clampReputationDelta(999)).toBe(25)
    expect(clampReputationDelta(-999)).toBe(-25)
    expect(clampReputationDelta(10)).toBe(10)
  })

  it('applyReputationDelta clamps score and returns band', () => {
    const jumped = applyReputationDelta(-90, 25)
    expect(jumped.score).toBe(-65)
    expect(jumped.band).toBe('hostile')
    expect(jumped.band).not.toBe('allied')

    const capped = applyReputationDelta(90, 25)
    expect(capped.score).toBe(100)
    expect(capped.band).toBe('allied')
  })

  it('clampReputationScore and parsers', () => {
    expect(clampReputationScore(200)).toBe(100)
    expect(clampReputationScore(-200)).toBe(-100)
    expect(isReputationBand('neutral')).toBe(true)
    expect(parseReputationBand('beloved')).toBeUndefined()
  })
})

describe('digest budgets', () => {
  it('locks slim vs enriched line caps', () => {
    expect(FACTION_DIGEST_SLIM_MAX_LINES).toBe(6)
    expect(FACTION_DIGEST_ENRICHED_MAX_LINES).toBe(10)
    expect(FACTION_RELATION_DIGEST_SLIM_MAX).toBe(4)
    expect(FACTION_RELATION_DIGEST_ENRICHED_MAX).toBe(8)
    expect(FACTION_REPUTATION_DIGEST_MAX).toBe(6)
    expect(FACTION_DIGEST_LINE_MAX_CHARS).toBe(120)
  })

  it('shouldEnrichFactionDigest when heavy or intrigue/faith tagged', () => {
    expect(shouldEnrichFactionDigest({ pressure: 'light', intrigueOrFaithTagged: false })).toBe(
      false
    )
    expect(shouldEnrichFactionDigest({ pressure: 'heavy', intrigueOrFaithTagged: false })).toBe(
      true
    )
    expect(shouldEnrichFactionDigest({ pressure: 'light', intrigueOrFaithTagged: true })).toBe(true)
  })
})
