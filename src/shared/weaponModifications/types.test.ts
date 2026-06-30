import { describe, expect, it } from 'vitest'
import {
  isItemModificationKind,
  parseItemModificationAgentResponse,
  parseItemModificationPayload,
  parseItemModificationProposal
} from './types'

describe('weapon modification shared type guards', () => {
  it('isItemModificationKind accepts valid kinds', () => {
    expect(isItemModificationKind('addDamageComponent')).toBe(true)
    expect(isItemModificationKind('setDisplayName')).toBe(true)
    expect(isItemModificationKind('transmute')).toBe(false)
  })

  it('parseItemModificationPayload validates addDamageComponent JSON', () => {
    expect(
      parseItemModificationPayload('addDamageComponent', {
        damageType: 'fire',
        diceCount: 1,
        diceSize: 6
      })
    ).toEqual({ damageType: 'fire', diceCount: 1, diceSize: 6 })
    expect(parseItemModificationPayload('addDamageComponent', { damageType: 'fire' })).toBeNull()
    expect(parseItemModificationPayload('addDamageComponent', { damageType: 'lightning', diceCount: 1, diceSize: 6 })).toBeNull()
  })

  it('parseItemModificationProposal validates agent modification block', () => {
    const valid = parseItemModificationProposal({
      targetCharacterItemId: 'ci-1',
      kind: 'addDamageComponent',
      damageType: 'fire',
      diceCount: 1,
      diceSize: 6
    })
    expect(valid?.kind).toBe('addDamageComponent')
    expect(parseItemModificationProposal({ targetCharacterItemId: 'x', kind: 'bad' })).toBeNull()
  })

  it('parseItemModificationAgentResponse requires narration and modification', () => {
    const parsed = parseItemModificationAgentResponse({
      narrationText: 'Flames crawl along the blade.',
      modification: {
        targetCharacterItemId: 'ci-1',
        kind: 'addDamageComponent',
        damageType: 'fire',
        diceCount: 1,
        diceSize: 6
      }
    })
    expect(parsed?.narrationText).toContain('Flames')
    expect(parsed?.modification.damageType).toBe('fire')
    expect(parseItemModificationAgentResponse({ narrationText: 'x' })).toBeNull()
  })
})
