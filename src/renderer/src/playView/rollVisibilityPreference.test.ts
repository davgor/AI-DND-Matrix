import { describe, expect, it } from 'vitest'
import { getShowRolls, setShowRolls, type KeyValueStorage } from './rollVisibilityPreference'

function createFakeStorage(): KeyValueStorage {
  const store = new Map<string, string>()
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value)
  }
}

describe('roll visibility preference', () => {
  it('defaults to showing rolls when nothing has been stored yet', () => {
    expect(getShowRolls(createFakeStorage())).toBe(true)
  })

  it('persists the preference through the same storage, surviving a fresh read', () => {
    const storage = createFakeStorage()
    setShowRolls(storage, false)
    expect(getShowRolls(storage)).toBe(false)

    setShowRolls(storage, true)
    expect(getShowRolls(storage)).toBe(true)
  })
})
