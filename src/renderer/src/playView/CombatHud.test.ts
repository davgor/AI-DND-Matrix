import { describe, expect, it } from 'vitest'
import { fleeFeedPrefix } from './CombatHud'
import type { CombatStateSnapshot } from '../../../shared/combat/types'

describe('CombatHud flee states', () => {
  it('uses distinct copy prefixes for each flee phase', () => {
    expect(fleeFeedPrefix('failed')).toBe('Flee failed — ')
    expect(fleeFeedPrefix('pursued')).toBe('Still pursued — ')
    expect(fleeFeedPrefix('escaped')).toBe('Escaped — ')
  })

  it('marks pursued combat state for HUD indicator', () => {
    const state: CombatStateSnapshot = {
      encounterId: 'e1',
      round: 2,
      activeCombatant: { kind: 'player', id: 'p1' },
      pursuitState: 'pursued',
      playerExited: false,
      initiativeOrder: [],
      combatants: []
    }
    expect(state.pursuitState).toBe('pursued')
  })

  it('reflects player exit while combatants remain', () => {
    const state: CombatStateSnapshot = {
      encounterId: 'e1',
      round: 3,
      activeCombatant: { kind: 'ai_party_member', id: 'ally1' },
      pursuitState: 'engaged',
      playerExited: true,
      initiativeOrder: [{ ref: { kind: 'ai_party_member', id: 'ally1' }, name: 'Rook', roll: 12, isActive: true }],
      combatants: [{ ref: { kind: 'npc', id: 'n1' }, name: 'Goblin', hp: 4, maxHp: 6, conditions: [], isActive: false }]
    }
    expect(state.playerExited).toBe(true)
    expect(state.combatants.length).toBeGreaterThan(0)
  })
})
