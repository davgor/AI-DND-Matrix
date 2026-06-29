import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { seedStarterItemCatalog } from './seedStarterItems'
import { findCatalogItemByName } from './repositories/items'

describe('seedStarterItemCatalog', () => {
  it('loads idempotently via migration', () => {
    const db = createTestDb()
    const firstCount = db.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number }
    expect(firstCount.count).toBeGreaterThanOrEqual(12)
    const before = firstCount.count
    seedStarterItemCatalog(db)
    const after = db.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number }
    expect(after.count).toBe(before)
    expect(findCatalogItemByName(db, 'Longsword')).toBeDefined()
  })
})
