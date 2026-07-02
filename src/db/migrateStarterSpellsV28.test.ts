import { describe, expect, it } from 'vitest'
import { getSpellByKey } from './catalog/spells'
import { migrations } from './schema'
import { createTestDb } from './testUtils'

describe('migration v28 starter spell backfill', () => {
  it('re-imports spells added after v27 already ran on legacy saves', () => {
    const db = createTestDb()
    db.prepare(
      `DELETE FROM catalog_spells WHERE key IN ('magic-missile', 'shocking-grasp', 'mage-armor', 'ray-of-frost')`
    ).run()
    expect(getSpellByKey(db, 'magic-missile')).toBeUndefined()

    const migration = migrations.find((entry) => entry.version === 28)
    expect(migration).toBeDefined()
    migration!.up(db)

    expect(getSpellByKey(db, 'magic-missile')?.name).toBe('Magic Missile')
    expect(getSpellByKey(db, 'shocking-grasp')?.name).toBe('Shocking Grasp')
    expect(getSpellByKey(db, 'mage-armor')?.name).toBe('Mage Armor')
    expect(getSpellByKey(db, 'ray-of-frost')?.name).toBe('Ray of Frost')
  })
})
