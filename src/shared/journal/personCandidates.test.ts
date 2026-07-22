import { describe, expect, it } from 'vitest'
import {
  excludeSpeakerFromPersonCandidates,
  mergePersonMatchCandidates
} from './personCandidates'
import type { PersonMatchCandidate } from './types'

const mira: PersonMatchCandidate = { npcId: 'npc-mira', name: 'Mira' }
const anna: PersonMatchCandidate = { npcId: 'npc-anna', name: 'Anna' }
const miraAgain: PersonMatchCandidate = { npcId: 'npc-mira', name: 'Mira Thorn' }

describe('mergePersonMatchCandidates', () => {
  it('unions candidates from multiple sources unique by npcId', () => {
    expect(mergePersonMatchCandidates([mira], [anna])).toEqual([mira, anna])
  })

  it('keeps the first occurrence when the same npcId appears twice', () => {
    expect(mergePersonMatchCandidates([mira], [miraAgain, anna])).toEqual([mira, anna])
  })

  it('returns empty when all sources are empty', () => {
    expect(mergePersonMatchCandidates([], [])).toEqual([])
  })
})

describe('excludeSpeakerFromPersonCandidates', () => {
  it('removes the speaker npcId and keeps other candidates', () => {
    expect(excludeSpeakerFromPersonCandidates([mira, anna], 'npc-mira')).toEqual([anna])
  })

  it('returns the same list when speakerNpcId is missing', () => {
    expect(excludeSpeakerFromPersonCandidates([mira, anna], undefined)).toEqual([mira, anna])
    expect(excludeSpeakerFromPersonCandidates([mira, anna], null)).toEqual([mira, anna])
  })
})
