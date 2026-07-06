import { describe, expect, it } from 'vitest'
import { validatePartyMembers, type PartyMemberDraft } from './PartyMemberSetup'

describe('validatePartyMembers', () => {
  it('requires name, class, personality, and race for each member', () => {
    const complete: PartyMemberDraft = {
      name: 'Brom',
      characterClass: 'ranger',
      personality: 'gruff',
      raceKey: 'human'
    }
    expect(validatePartyMembers([complete])).toBeNull()
    expect(validatePartyMembers([{ ...complete, raceKey: '' }])).toContain('race')
    expect(validatePartyMembers([{ ...complete, name: '' }])).toContain('name')
  })
})
