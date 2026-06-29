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

describe('player sheet collapsed preference', () => {
  it('defaults to expanded when nothing has been stored yet', () => {
    expect(getPlayerSheetCollapsed(createFakeStorage())).toBe(false)
  })

  it('persists collapse state across reads', () => {
    const storage = createFakeStorage()
    setPlayerSheetCollapsed(storage, true)
    expect(getPlayerSheetCollapsed(storage)).toBe(true)
    setPlayerSheetCollapsed(storage, false)
    expect(getPlayerSheetCollapsed(storage)).toBe(false)
  })
})
