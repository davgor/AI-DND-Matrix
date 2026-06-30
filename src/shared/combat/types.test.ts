import { describe, expect, it } from 'vitest'
import {
  combatantRefKey,
  isCombatEncounterJson,
  isInitiativeEntry,
  normalizeCombatantRef,
  parseCombatantRefKey
} from './types'

describe('combatant ref normalization', () => {
  it('round-trips ref keys', () => {
    const ref = { kind: 'npc' as const, id: 'abc-123' }
    expect(parseCombatantRefKey(combatantRefKey(ref))).toEqual(ref)
  })

  it('rejects invalid refs', () => {
    expect(normalizeCombatantRef({ kind: 'dragon', id: 'x' })).toBeUndefined()
    expect(normalizeCombatantRef(null)).toBeUndefined()
  })
})

describe('encounter JSON guards', () => {
  const validEncounter = {
    id: 'enc-1',
    campaignId: 'camp-1',
    phase: 'active',
    initiativeOrder: [{ combatant: { kind: 'player', id: 'p1' }, roll: 15 }],
    activeTurnIndex: 0,
    round: 1,
    participantIds: [{ kind: 'player', id: 'p1' }],
    pursuitState: 'engaged',
    exitedCombatantIds: [],
    startedAt: '2026-01-01T00:00:00.000Z'
  }

  it('accepts valid encounter state', () => {
    expect(isCombatEncounterJson(validEncounter)).toBe(true)
    expect(isInitiativeEntry(validEncounter.initiativeOrder[0])).toBe(true)
  })

  it('rejects malformed initiative or phase', () => {
    expect(isCombatEncounterJson({ ...validEncounter, phase: 'idle' })).toBe(false)
    expect(isCombatEncounterJson({ ...validEncounter, initiativeOrder: [{}] })).toBe(false)
  })
})
