import { describe, expect, it } from 'vitest'
import {
  evaluateDefeatRules,
  defeatLocationTag,
  defeatNarrationTemplate,
  type DefeatRuleInput
} from './defeatRules'
import { DEFEAT_DISPOSITIONS } from '../shared/npcCombat/types'

function makeInput(overrides: Partial<DefeatRuleInput> = {}): DefeatRuleInput {
  return {
    victorName: 'Mara',
    role: 'guard captain',
    alignment: 'lawful_good',
    backstory: 'Mara led the town guard for twenty years before retiring.',
    deathMode: 'legendary',
    ...overrides
  }
}

describe('evaluateDefeatRules: lawful law-keeper imprisons', () => {
  it('lawful_good guard captain backstory maps to imprison with a location tag', () => {
    const decision = evaluateDefeatRules(makeInput())
    expect(decision.kind).toBe('proposal')
    if (decision.kind === 'proposal') {
      expect(decision.proposal.disposition).toBe('imprison')
      expect(decision.proposal.locationTag).toBeDefined()
      expect(decision.proposal.narrationText).toContain('Mara')
    }
  })

  it('lawful_evil warden also imprisons', () => {
    const decision = evaluateDefeatRules(
      makeInput({ alignment: 'lawful_evil', role: 'prison warden', backstory: 'A warden feared by inmates.' })
    )
    expect(decision).toMatchObject({ kind: 'proposal', proposal: { disposition: 'imprison' } })
  })
})

describe('evaluateDefeatRules: outlaw backstories', () => {
  it('chaotic_good reformed bandit maps to bury_out_back', () => {
    const decision = evaluateDefeatRules(
      makeInput({
        alignment: 'chaotic_good',
        role: 'reformed bandit',
        backstory: 'A former bandit who went straight after a decade on the road.'
      })
    )
    expect(decision).toMatchObject({ kind: 'proposal', proposal: { disposition: 'bury_out_back' } })
  })

  it('evil outlaw holds the player for ransom with a location tag', () => {
    const decision = evaluateDefeatRules(
      makeInput({ alignment: 'neutral_evil', role: 'brigand', backstory: 'A brigand preying on the trade road.' })
    )
    expect(decision.kind).toBe('proposal')
    if (decision.kind === 'proposal') {
      expect(decision.proposal.disposition).toBe('ransom')
      expect(decision.proposal.locationTag).toBeDefined()
    }
  })

  it('chaotic_neutral pirate ransoms too', () => {
    const decision = evaluateDefeatRules(
      makeInput({ alignment: 'chaotic_neutral', role: 'pirate', backstory: 'A pirate captain between ships.' })
    )
    expect(decision).toMatchObject({ kind: 'proposal', proposal: { disposition: 'ransom' } })
  })
})

describe('evaluateDefeatRules: killers and death mode', () => {
  it('evil killer executes when death mode is reversible (standard)', () => {
    const decision = evaluateDefeatRules(
      makeInput({ alignment: 'chaotic_evil', role: 'sellsword', backstory: 'A merciless killer for hire.', deathMode: 'standard' })
    )
    expect(decision).toMatchObject({ kind: 'proposal', proposal: { disposition: 'execute' } })
  })

  it('evil killer under legendary death mode is ambiguous (permadeath deferred to LLM)', () => {
    const decision = evaluateDefeatRules(
      makeInput({ alignment: 'chaotic_evil', role: 'sellsword', backstory: 'A merciless killer for hire.', deathMode: 'legendary' })
    )
    expect(decision).toEqual({ kind: 'ambiguous' })
  })
})

describe('evaluateDefeatRules: alignment-only defaults', () => {
  it('good victor without keywords releases the player in mercy', () => {
    const decision = evaluateDefeatRules(
      makeInput({ alignment: 'neutral_good', role: 'baker', backstory: 'Bakes bread every dawn.' })
    )
    expect(decision).toMatchObject({ kind: 'proposal', proposal: { disposition: 'mercy_release' } })
  })

  it('lawful_neutral without keywords imprisons', () => {
    const decision = evaluateDefeatRules(
      makeInput({ alignment: 'lawful_neutral', role: 'scribe', backstory: 'Keeps meticulous ledgers.' })
    )
    expect(decision).toMatchObject({ kind: 'proposal', proposal: { disposition: 'imprison' } })
  })

  it('true_neutral without keywords leaves the player unconscious', () => {
    const decision = evaluateDefeatRules(
      makeInput({ alignment: 'true_neutral', role: 'hermit', backstory: 'Lives alone in the hills.' })
    )
    expect(decision).toMatchObject({ kind: 'proposal', proposal: { disposition: 'leave_unconscious' } })
  })

  it('unmarked evil is ambiguous (character-driven, LLM decides)', () => {
    const decision = evaluateDefeatRules(
      makeInput({ alignment: 'neutral_evil', role: 'merchant', backstory: 'A trader with cold eyes.' })
    )
    expect(decision).toEqual({ kind: 'ambiguous' })
  })

  it('unknown alignment is ambiguous', () => {
    const decision = evaluateDefeatRules(makeInput({ alignment: null }))
    expect(decision).toEqual({ kind: 'ambiguous' })
  })
})

describe('defeat narration and location templates', () => {
  it('produces a non-empty narration naming the victor for every disposition', () => {
    for (const disposition of DEFEAT_DISPOSITIONS) {
      const text = defeatNarrationTemplate('Grask', disposition)
      expect(text.length).toBeGreaterThan(0)
      expect(text).toContain('Grask')
    }
  })

  it('produces a location tag for imprison and ransom, none otherwise', () => {
    expect(defeatLocationTag('Grask', 'imprison')).toBeDefined()
    expect(defeatLocationTag('Grask', 'ransom')).toBeDefined()
    expect(defeatLocationTag('Grask', 'leave_unconscious')).toBeUndefined()
    expect(defeatLocationTag('Grask', 'mercy_release')).toBeUndefined()
  })
})
