import { describe, expect, it } from 'vitest'
import {
  isAttackLethality,
  isDefeatDisposition,
  isNpcCombatTier,
  isNpcYieldReviewOutcome,
  isRetiredAdventurerProfile,
  NPC_YIELD_REVIEW_OUTCOMES,
  parseDefeatDispositionProposal,
  parseRetiredAdventurerReview,
  parseYieldReviewResult
} from './types'

describe('npcCombat tier and disposition enums', () => {
  it('validates combat tier enums', () => {
    expect(isNpcCombatTier('villager')).toBe(true)
    expect(isNpcCombatTier('catalog')).toBe(true)
    expect(isNpcCombatTier('monster')).toBe(false)
  })

  it('validates retired adventurer profiles', () => {
    expect(isRetiredAdventurerProfile('veteran')).toBe(true)
    expect(isRetiredAdventurerProfile('paladin')).toBe(false)
  })

  it('validates defeat disposition enums', () => {
    expect(isDefeatDisposition('imprison')).toBe(true)
    expect(isDefeatDisposition('bury_out_back')).toBe(true)
    expect(isDefeatDisposition('flee')).toBe(false)
  })

  it('validates attack lethality enum', () => {
    expect(isAttackLethality('lethal')).toBe(true)
    expect(isAttackLethality('non_lethal')).toBe(true)
    expect(isAttackLethality('maim')).toBe(false)
  })

  it('validates yield review outcome enum, including the transient fight_on value', () => {
    expect(isNpcYieldReviewOutcome('surrender')).toBe(true)
    expect(isNpcYieldReviewOutcome('fight_on')).toBe(true)
    expect(isNpcYieldReviewOutcome('mercy_release')).toBe(false)
  })
})

describe('npcCombat JSON parsers', () => {
  it('parses retired adventurer review JSON with safe defaults', () => {
    expect(parseRetiredAdventurerReview({ upgrade: false })).toEqual({ upgrade: false })
    expect(parseRetiredAdventurerReview({ upgrade: true, profile: 'veteran' })).toEqual({
      upgrade: true,
      profile: 'veteran'
    })
    expect(parseRetiredAdventurerReview({ upgrade: true, profile: 'invalid' })).toEqual({
      upgrade: false
    })
    expect(parseRetiredAdventurerReview(null)).toEqual({ upgrade: false })
  })

  it('parses defeat disposition proposal JSON', () => {
    expect(
      parseDefeatDispositionProposal({
        disposition: 'imprison',
        narrationText: 'The guard claps irons on your wrists.'
      })
    ).toEqual({
      disposition: 'imprison',
      narrationText: 'The guard claps irons on your wrists.'
    })
    expect(parseDefeatDispositionProposal({ disposition: 'bad', narrationText: 'x' })).toBeUndefined()
    expect(parseDefeatDispositionProposal({ disposition: 'execute' })).toBeUndefined()
  })

  it('parses a yield review result restricted to the allowed outcome set', () => {
    expect(
      parseYieldReviewResult(
        { outcome: 'surrender', narrationText: 'The farmer drops his pitchfork.' },
        ['surrender', 'flee']
      )
    ).toEqual({ outcome: 'surrender', narrationText: 'The farmer drops his pitchfork.' })

    expect(
      parseYieldReviewResult({ outcome: 'surrender', narrationText: 'x' }, ['flee'])
    ).toBeUndefined()
    expect(parseYieldReviewResult({ outcome: 'fight_on' }, NPC_YIELD_REVIEW_OUTCOMES)).toBeUndefined()
    expect(parseYieldReviewResult(null, NPC_YIELD_REVIEW_OUTCOMES)).toBeUndefined()
  })
})
