import { describe, expect, it } from 'vitest'
import { addModification } from './characterItemModifications'
import { getEquippedWeaponDamageProfile } from './characterItems'
import { resolvePlayerAttackAgainstNpc } from '../../engine/playerAttack'
import { seedLongswordHero } from './weaponDamageProfileFixtures'

describe('equipped weapon damage profile unmodified', () => {
  it('matches pre-epic totals for unmodified weapon', () => {
    const { db, player } = seedLongswordHero()
    const profile = getEquippedWeaponDamageProfile(db, player.id)
    expect(profile.components).toHaveLength(1)
    expect(profile.components[0]?.damageRoll).toEqual({ diceCount: 1, diceSize: 8, modifier: 0 })
    db.close()
  })
})

describe('equipped weapon damage profile enchanted', () => {
  it('returns physical + fire breakdown for enchanted longsword', () => {
    const { db, player, row } = seedLongswordHero()
    addModification(db, row.id, 'addDamageComponent', { damageType: 'fire', diceCount: 1, diceSize: 6 })
    const profile = getEquippedWeaponDamageProfile(db, player.id)
    const attack = resolvePlayerAttackAgainstNpc({
      rng: () => 0.95,
      attackModifier: 5,
      weaponComponents: profile.components,
      targetAc: 10,
      targetHp: 20,
      targetResistances: { fire: 'resistant' }
    })
    expect(profile.components).toHaveLength(2)
    expect(attack.damageBreakdown.components).toHaveLength(2)
    db.close()
  })
})
