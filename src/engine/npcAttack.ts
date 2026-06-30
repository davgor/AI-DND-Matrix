import type { RandomFn } from './abilities'
import { rollD20 } from './checks'
import { isNaturalTwenty, resolveDamage, type DamageRoll } from './damage'

export interface NpcAttackParams {
  rng: RandomFn
  attackBonus: number
  damageRoll: DamageRoll
  targetAc: number
  targetHp: number
}

export interface NpcAttackResolution {
  hit: boolean
  crit: boolean
  attackRoll: number
  attackTotal: number
  damage: number
  targetHpAfter: number
}

export function resolveNpcAttack(params: NpcAttackParams): NpcAttackResolution {
  const attackRoll = rollD20(params.rng)
  const attackTotal = attackRoll + params.attackBonus

  if (attackRoll === 1 || attackTotal < params.targetAc) {
    return {
      hit: false,
      crit: false,
      attackRoll,
      attackTotal,
      damage: 0,
      targetHpAfter: params.targetHp
    }
  }

  const crit = isNaturalTwenty(attackRoll)
  const damage = resolveDamage(params.damageRoll, params.rng, crit)
  const targetHpAfter = Math.max(0, params.targetHp - damage)
  return { hit: true, crit, attackRoll, attackTotal, damage, targetHpAfter }
}
