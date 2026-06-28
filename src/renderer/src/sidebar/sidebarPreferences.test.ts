import { describe, expect, it } from 'vitest'
import { getSidebarCollapsed, setSidebarCollapsed, type KeyValueStorage } from './sidebarPreferences'

function createFakeStorage(): KeyValueStorage {
  const store = new Map<string, string>()
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value)
  }
}

describe('sidebar collapsed preference', () => {
  it('defaults to expanded (not collapsed) when nothing has been stored yet', () => {
    expect(getSidebarCollapsed(createFakeStorage())).toBe(false)
  })

  it('persists the collapsed state through the same storage, surviving a fresh read', () => {
    const storage = createFakeStorage()
    setSidebarCollapsed(storage, true)
    expect(getSidebarCollapsed(storage)).toBe(true)

    setSidebarCollapsed(storage, false)
    expect(getSidebarCollapsed(storage)).toBe(false)
  })
})
