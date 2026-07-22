import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter, getCharacterById, updateCharacter } from './repositories/characters'
import {
  applyTurnLockout,
  isActionLocked,
  resolveLockoutCostFromCatalog,
  tickTurnLockout,
  type LockoutStats
} from '../engine/turnLockout'

describe('turn lockout stats persistence (126.2)', () => {
  it('round-trips actionLockoutTurnsRemaining on character stats', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Lockout',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'mage',
      kind: 'player'
    })

    const cost = resolveLockoutCostFromCatalog(2, 99)
    const locked = applyTurnLockout(hero.stats as LockoutStats, cost)
    updateCharacter(db, hero.id, { stats: { ...hero.stats, ...locked } })

    const reloaded = getCharacterById(db, hero.id)!
    expect((reloaded.stats as LockoutStats).actionLockoutTurnsRemaining).toBe(2)
    expect(isActionLocked(reloaded.stats as LockoutStats)).toBe(true)

    const afterTick = tickTurnLockout(reloaded.stats as LockoutStats)
    updateCharacter(db, hero.id, { stats: { ...reloaded.stats, ...afterTick } })
    expect(
      (getCharacterById(db, hero.id)!.stats as LockoutStats).actionLockoutTurnsRemaining
    ).toBe(1)
  })
})
