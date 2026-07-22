import { describe, expect, it } from 'vitest'
import {
  deriveRelationshipWebEdges,
  filterKnownNpcSubjects,
  isOpinionSubject,
  isOpinionStance,
  isRelationshipWebDto,
  needsSubjectOpinionRegeneration,
  npcOpinionSubject,
  otherPlayerSubjectOptions,
  parseOpinionStance,
  playerOpinionSubject,
  type NpcOpinionRow
} from './types'

describe('opinion subject helpers', () => {
  it('builds player and npc subjects', () => {
    expect(playerOpinionSubject('char-1')).toEqual({
      subjectType: 'player_character',
      subjectId: 'char-1'
    })
    expect(npcOpinionSubject('npc-2')).toEqual({
      subjectType: 'npc',
      subjectId: 'npc-2'
    })
  })

  it('guards subject and stance shapes', () => {
    expect(isOpinionSubject({ subjectType: 'npc', subjectId: 'x' })).toBe(true)
    expect(isOpinionSubject({ subjectType: 'faction', subjectId: 'x' })).toBe(false)
    expect(isOpinionStance('warm')).toBe(true)
    expect(parseOpinionStance('nope')).toBe('unknown')
  })
})

describe('needsSubjectOpinionRegeneration', () => {
  it('matches 105 freshness rules per subject', () => {
    expect(
      needsSubjectOpinionRegeneration({
        opinionSummary: null,
        opinionSummaryGeneratedAt: null,
        lastPlayerInteractionAt: null
      })
    ).toBe(true)
    expect(
      needsSubjectOpinionRegeneration({
        opinionSummary: 'Ok.',
        opinionSummaryGeneratedAt: '2026-07-20T12:00:00.000Z',
        lastPlayerInteractionAt: '2026-07-20T11:00:00.000Z'
      })
    ).toBe(false)
    expect(
      needsSubjectOpinionRegeneration({
        opinionSummary: 'Ok.',
        opinionSummaryGeneratedAt: '2026-07-20T12:00:00.000Z',
        lastPlayerInteractionAt: '2026-07-20T13:00:00.000Z'
      })
    ).toBe(true)
  })
})

describe('known-candidate subject filtering', () => {
  it('excludes the holder and keeps only known candidates', () => {
    const options = filterKnownNpcSubjects(
      [
        { npcId: 'holder', name: 'Self' },
        { npcId: 'other', name: 'Mara' }
      ],
      'holder'
    )
    expect(options).toEqual([
      { subject: { subjectType: 'npc', subjectId: 'other' }, label: 'Mara' }
    ])
  })

  it('lists other PCs but not the active character', () => {
    expect(
      otherPlayerSubjectOptions(
        [
          { id: 'me', name: 'Hero' },
          { id: 'ally', name: 'Ally' }
        ],
        'me'
      )
    ).toEqual([{ subject: { subjectType: 'player_character', subjectId: 'ally' }, label: 'Ally' }])
  })
})

describe('relationship web derivation', () => {
  const baseRow = (overrides: Partial<NpcOpinionRow>): NpcOpinionRow => ({
    id: 'op-1',
    campaignId: 'camp',
    npcId: 'npc-a',
    subjectType: 'npc',
    subjectId: 'npc-b',
    summary: 'Distrusts them.',
    generatedAt: '2026-07-20T12:00:00.000Z',
    lastRelevantInteractionAt: null,
    stance: 'wary',
    ...overrides
  })

  it('emits edges only when summary exists', () => {
    expect(
      deriveRelationshipWebEdges([
        baseRow({}),
        baseRow({ id: 'op-2', summary: null, subjectId: 'npc-c' })
      ])
    ).toEqual([
      {
        fromNpcId: 'npc-a',
        subjectType: 'npc',
        subjectId: 'npc-b',
        stance: 'wary',
        hasSummary: true
      }
    ])
  })

  it('accepts a well-formed web DTO', () => {
    expect(
      isRelationshipWebDto({
        nodes: [{ id: 'npc-a', name: 'Ada', kind: 'npc' }],
        edges: [
          {
            fromNpcId: 'npc-a',
            subjectType: 'player_character',
            subjectId: 'hero',
            stance: 'warm',
            hasSummary: true
          }
        ]
      })
    ).toBe(true)
  })
})
