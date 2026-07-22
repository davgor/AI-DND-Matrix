import type { RandomFn } from './abilities'
import { rollD20WithMode } from './checks'
import { attackAdvantageMode, type Condition } from './conditions'
import { isNaturalTwenty, type ResistanceProfile } from './damage'
import { resolveWeaponDamageAgainstProfile } from './weaponDamage'
import type { AttackLethality } from '../shared/npcCombat/types'
import type { DamageBreakdown, DamageComponent } from '../shared/weaponModifications/types'

export interface PlayerAttackParams {
  rng: RandomFn
  attackModifier: number
  weaponComponents: DamageComponent[]
  targetAc: number
  targetHp: number
  targetResistances?: ResistanceProfile
  /** Default: 'lethal'. Non-lethal stops at incapacitation rather than kill. */
  lethality?: AttackLethality
  /** Attacker sheet/NPC conditions — disadvantage applied per CONDITION_EFFECTS. */
  attackerConditions?: Condition[]
}

export interface PlayerAttackResolution {
  hit: boolean
  crit: boolean
  attackRoll: number
  attackTotal: number
  damage: number
  damageBreakdown: DamageBreakdown
  targetHpAfter: number
  targetDefeated: boolean
  lethality: AttackLethality
  incapacitated: boolean
  wouldKill: boolean
}

interface MissInput {
  attackRoll: number
  attackTotal: number
  targetHp: number
  lethality: AttackLethality
  damageBreakdown: DamageBreakdown
}

export function resolvePlayerAttackAgainstNpc(params: PlayerAttackParams): PlayerAttackResolution {
  const lethality = params.lethality ?? 'lethal'
  const attackRoll = rollD20WithMode(
    params.rng,
    attackAdvantageMode(params.attackerConditions ?? [])
  )
  const attackTotal = attackRoll + params.attackModifier
  const emptyBreakdown: DamageBreakdown = { components: [], total: 0 }

  if (attackRoll === 1) {
    return missResult({ attackRoll, attackTotal, targetHp: params.targetHp, lethality, damageBreakdown: emptyBreakdown })
  }

  const crit = isNaturalTwenty(attackRoll)
  if (!crit && attackTotal < params.targetAc) {
    return missResult({ attackRoll, attackTotal, targetHp: params.targetHp, lethality, damageBreakdown: emptyBreakdown })
  }

  const damageBreakdown = resolveWeaponDamageAgainstProfile(
    params.weaponComponents,
    params.rng,
    crit,
    params.targetResistances ?? {}
  )
  const damage = damageBreakdown.total
  const targetHpAfter = Math.max(0, params.targetHp - damage)
  const wouldKill = lethality === 'lethal' && targetHpAfter <= 0
  const incapacitated = lethality === 'non_lethal' && targetHpAfter <= 0
  return {
    hit: true,
    crit,
    attackRoll,
    attackTotal,
    damage,
    damageBreakdown,
    targetHpAfter,
    targetDefeated: targetHpAfter <= 0,
    lethality,
    incapacitated,
    wouldKill
  }
}

function missResult(input: MissInput): PlayerAttackResolution {
  return {
    hit: false,
    crit: false,
    attackRoll: input.attackRoll,
    attackTotal: input.attackTotal,
    damage: 0,
    damageBreakdown: input.damageBreakdown,
    targetHpAfter: input.targetHp,
    targetDefeated: false,
    lethality: input.lethality,
    incapacitated: false,
    wouldKill: false
  }
}
