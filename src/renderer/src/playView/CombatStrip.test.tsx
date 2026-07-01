import { describe, expect, it } from 'vitest'
import { combatStripToggleLabel } from './CombatStrip'
import { getCombatStripCollapsed, setCombatStripCollapsed } from './combatStripPreferences'
import type { KeyValueStorage } from '../sidebar/sidebarPreferences'

function createFakeStorage(): KeyValueStorage {
  const store = new Map<string, string>()
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value)
  }
}

describe('CombatStrip', () => {
  it('uses distinct toggle labels for collapsed and expanded states', () => {
    expect(combatStripToggleLabel(false)).toBe('Hide combat')
    expect(combatStripToggleLabel(true)).toBe('Show combat')
  })

  it('persists collapse preference in storage', () => {
    const storage = createFakeStorage()
    setCombatStripCollapsed(storage, true)
    expect(getCombatStripCollapsed(storage)).toBe(true)
  })
})
