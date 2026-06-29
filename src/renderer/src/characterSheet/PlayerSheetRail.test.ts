import { describe, expect, it } from 'vitest'
import { getPlayerSheetCollapsed, setPlayerSheetCollapsed } from './playerSheetPreferences'
import type { KeyValueStorage } from '../sidebar/sidebarPreferences'

function createFakeStorage(): KeyValueStorage {
  const store = new Map<string, string>()
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value)
  }
}

describe('player sheet rail persistence', () => {
  it('restores prior collapse state from storage', () => {
    const storage = createFakeStorage()
    setPlayerSheetCollapsed(storage, true)
    expect(getPlayerSheetCollapsed(storage)).toBe(true)
  })
})
