import { describe, expect, it } from 'vitest'
import { matchPersonNames } from './matchPersonNames'
import type { PersonMatchCandidate } from './types'

const anna: PersonMatchCandidate = { npcId: 'npc-anna', name: 'Anna' }
const ann: PersonMatchCandidate = { npcId: 'npc-ann', name: 'Ann' }
const boris: PersonMatchCandidate = { npcId: 'npc-boris', name: 'Boris' }

describe('matchPersonNames empty input', () => {
  it('returns empty spans for empty text', () => {
    expect(matchPersonNames('', [anna])).toEqual([])
  })

  it('returns empty spans for empty candidates', () => {
    expect(matchPersonNames('Anna smiled.', [])).toEqual([])
  })
})

describe('matchPersonNames single hits', () => {
  it('returns a case-insensitive boundary-safe hit', () => {
    expect(matchPersonNames('anna smiled at dawn.', [anna])).toEqual([
      { start: 0, end: 4, npcId: 'npc-anna' }
    ])
  })

  it('does not match a name inside a larger word', () => {
    expect(matchPersonNames('McAnn arrived.', [ann])).toEqual([])
    expect(matchPersonNames('Anna smiled.', [ann])).toEqual([])
  })

  it('matches names at punctuation and string edges', () => {
    expect(matchPersonNames('(Ann)', [ann])).toEqual([
      { start: 1, end: 4, npcId: 'npc-ann' }
    ])
    expect(matchPersonNames('Ann', [ann])).toEqual([
      { start: 0, end: 3, npcId: 'npc-ann' }
    ])
  })

  it('prefers the longest name when one is a prefix of another', () => {
    expect(matchPersonNames('Anna waved.', [ann, anna])).toEqual([
      { start: 0, end: 4, npcId: 'npc-anna' }
    ])
  })

  it('returns multiple non-overlapping hits in start order', () => {
    expect(matchPersonNames('Anna met Boris.', [anna, boris])).toEqual([
      { start: 0, end: 4, npcId: 'npc-anna' },
      { start: 9, end: 14, npcId: 'npc-boris' }
    ])
  })
})

describe('matchPersonNames ambiguity', () => {
  it('emits no span when duplicate candidate names are ambiguous', () => {
    const twin: PersonMatchCandidate = { npcId: 'npc-anna-2', name: 'Anna' }
    expect(matchPersonNames('Anna smiled.', [anna, twin])).toEqual([])
  })

  it('still matches unambiguous names when another name is ambiguous', () => {
    const twin: PersonMatchCandidate = { npcId: 'npc-anna-2', name: 'Anna' }
    expect(matchPersonNames('Anna and Boris left.', [anna, twin, boris])).toEqual([
      { start: 9, end: 14, npcId: 'npc-boris' }
    ])
  })

  it('leaves unmatched names as non-spans (misses)', () => {
    expect(matchPersonNames('Clara smiled.', [anna])).toEqual([])
  })

  it('matches multi-word names with boundary safety', () => {
    const full: PersonMatchCandidate = { npcId: 'npc-full', name: 'Annabelle Reed' }
    expect(matchPersonNames('I spoke with Annabelle Reed today.', [full])).toEqual([
      { start: 13, end: 27, npcId: 'npc-full' }
    ])
  })
})
