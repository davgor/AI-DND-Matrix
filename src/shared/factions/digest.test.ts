import { describe, expect, it } from 'vitest'
import {
  FACTION_DIGEST_ENRICHED_MAX_LINES,
  FACTION_DIGEST_LINE_MAX_CHARS,
  FACTION_DIGEST_SLIM_MAX_LINES,
  FACTION_RELATION_DIGEST_ENRICHED_MAX,
  FACTION_RELATION_DIGEST_SLIM_MAX,
  FACTION_REPUTATION_DIGEST_MAX,
  type CharacterFactionReputation,
  type Faction,
  type FactionRelation
} from './types'
import {
  buildCompactPantheonDigestLines,
  buildFactionDigestLines,
  buildFactionRelationDigestLines,
  buildFactionReputationDigestLines
} from './digest'

function baseFaction(overrides: Partial<Faction> & Pick<Faction, 'id' | 'key' | 'name' | 'kind'>): Faction {
  return {
    campaignId: 'camp-1',
    summary: 'A power bloc.',
    motivation: null,
    publicFace: null,
    methods: null,
    deityId: null,
    homeRegionId: null,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    source: 'campaign_create',
    ...overrides
  }
}

describe('buildFactionDigestLines', () => {
  it('slim path omits summary and caps lines', () => {
    const factions = Array.from({ length: 8 }, (_, i) =>
      baseFaction({
        id: `f-${i}`,
        key: `key-${i}`,
        name: `Faction ${i}`,
        kind: 'civic',
        summary: 'Long summary that must not appear in slim digest.',
        sortOrder: i
      })
    )
    const lines = buildFactionDigestLines(factions, {
      enriched: false,
      deityNamesById: {}
    })
    expect(lines).toHaveLength(FACTION_DIGEST_SLIM_MAX_LINES)
    expect(lines[0]).toContain('Faction 0')
    expect(lines[0]).toContain('civic')
    expect(lines.every((line) => !line.includes('Long summary'))).toBe(true)
  })

  it('enriched path includes truncated summary and higher cap', () => {
    const factions = Array.from({ length: 12 }, (_, i) =>
      baseFaction({
        id: `f-${i}`,
        key: `key-${i}`,
        name: `Faction ${i}`,
        kind: 'religious',
        summary: 'Temple politics.',
        deityId: i === 0 ? 'god-1' : null,
        sortOrder: i
      })
    )
    const lines = buildFactionDigestLines(factions, {
      enriched: true,
      deityNamesById: { 'god-1': 'Vhalor' }
    })
    expect(lines).toHaveLength(FACTION_DIGEST_ENRICHED_MAX_LINES)
    expect(lines[0]).toContain('Temple politics')
    expect(lines[0]).toContain('Vhalor')
    expect(lines.every((line) => line.length <= FACTION_DIGEST_LINE_MAX_CHARS)).toBe(true)
  })
})

describe('buildFactionRelationDigestLines', () => {
  it('respects slim vs enriched caps', () => {
    const relations: FactionRelation[] = Array.from({ length: 10 }, (_, i) => ({
      id: `r-${i}`,
      campaignId: 'camp-1',
      factionAId: `a-${i}`,
      factionBId: `b-${i}`,
      stance: 'rival',
      summary: 'Feud',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }))
    const names = Object.fromEntries(
      relations.flatMap((r) => [
        [r.factionAId, `A${r.factionAId}`],
        [r.factionBId, `B${r.factionBId}`]
      ])
    )
    expect(
      buildFactionRelationDigestLines(relations, { enriched: false, factionNamesById: names })
    ).toHaveLength(FACTION_RELATION_DIGEST_SLIM_MAX)
    expect(
      buildFactionRelationDigestLines(relations, { enriched: true, factionNamesById: names })
    ).toHaveLength(FACTION_RELATION_DIGEST_ENRICHED_MAX)
  })
})

describe('buildFactionReputationDigestLines', () => {
  it('skips neutral rows and caps non-neutral', () => {
    const rows: CharacterFactionReputation[] = [
      {
        characterId: 'pc-1',
        factionId: 'f-1',
        score: 0,
        band: 'neutral',
        updatedAt: '2026-01-01T00:00:00.000Z',
        lastReason: null
      },
      ...Array.from({ length: 8 }, (_, i) => ({
        characterId: 'pc-1',
        factionId: `f-${i + 2}`,
        score: 40,
        band: 'friendly' as const,
        updatedAt: '2026-01-01T00:00:00.000Z',
        lastReason: 'helped'
      }))
    ]
    const lines = buildFactionReputationDigestLines(rows, {
      factionNamesById: Object.fromEntries(
        rows.map((r) => [r.factionId, `Name-${r.factionId}`])
      )
    })
    expect(lines).toHaveLength(FACTION_REPUTATION_DIGEST_MAX)
    expect(lines.every((line) => !line.includes('neutral'))).toBe(true)
  })
})

describe('buildCompactPantheonDigestLines', () => {
  it('formats name, epithet, domains, forgotten without tenets', () => {
    const lines = buildCompactPantheonDigestLines([
      {
        name: 'Vhalor',
        epithet: 'the Drowned Judge',
        domains: ['tides', 'oaths'],
        isForgotten: true
      }
    ])
    expect(lines).toEqual(['Vhalor, the Drowned Judge — tides, oaths (forgotten)'])
  })
})
