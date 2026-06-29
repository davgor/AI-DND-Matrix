import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { canonicalizeProposedItem } from './itemCanonicalization'

describe('itemCanonicalization', () => {
  it('creates a catalog row the first time an AI proposes a new item', () => {
    const db = createTestDb()
    const created = canonicalizeProposedItem(db, {
      name: 'Moonlit Fang',
      description: 'A blade that drinks starlight.',
      itemType: 'weapon',
      rarityTier: 'rare'
    })
    expect(created.source).toBe('ai_proposed')
    expect(created.mechanicalProperties.kind).toBe('weapon')
  })

  it('reuses an existing catalog entry when the same name is proposed again', () => {
    const db = createTestDb()
    const first = canonicalizeProposedItem(db, {
      name: 'Moonlit Fang',
      description: 'First description',
      itemType: 'weapon',
      rarityTier: 'common'
    })
    const second = canonicalizeProposedItem(db, {
      name: 'moonlit fang',
      description: 'Second description',
      itemType: 'weapon',
      rarityTier: 'epic'
    })
    expect(second.id).toBe(first.id)
    expect(
      db.prepare('SELECT COUNT(*) as count FROM items WHERE lower(name) = lower(?)').get('Moonlit Fang')
    ).toEqual({ count: 1 })
  })
})
