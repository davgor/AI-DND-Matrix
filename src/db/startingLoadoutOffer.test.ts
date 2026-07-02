import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { buildStartingLoadoutOffer, buildStartingLoadoutOfferWithDiagnostics } from './repositories/startingLoadout'

describe('buildStartingLoadoutOffer', () => {
  it('builds fighter offer from catalog seed data', () => {
    const db = createTestDb()
    const offer = buildStartingLoadoutOffer(db, 'fighter')
    expect(offer?.weapons.map((w) => w.name)).toContain('Longsword')
    expect(offer?.spellPickCount).toBe(1)
  })

  it('reports missing catalog entries instead of a silent failure', () => {
    const db = createTestDb()
    db.prepare('DELETE FROM items WHERE name = ?').run('Mace')
    const result = buildStartingLoadoutOfferWithDiagnostics(db, 'cleric')
    expect(result.offer).toBeUndefined()
    expect(result.missingItems).toContain('Mace')
  })
})
