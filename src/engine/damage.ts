import type { RandomFn } from './abilities'

export type DamageType = 'physical' | 'fire' | 'cold' | 'poison' | 'arcane'

export type ResistanceStatus = 'resistant' | 'vulnerable'

export type ResistanceProfile = Partial<Record<DamageType, ResistanceStatus>>

export interface DamageRoll {
  diceCount: number
  diceSize: number
  modifier: number
}

export function isNaturalTwenty(attackRoll: number): boolean {
  return attackRoll === 20
}

function rollDamageDie(rng: RandomFn, size: number): number {
  return Math.floor(rng() * size) + 1
}

export function resolveDamage(roll: DamageRoll, rng: RandomFn, isCritical: boolean): number {
  const diceCount = isCritical ? roll.diceCount * 2 : roll.diceCount
  let diceTotal = 0
  for (let i = 0; i < diceCount; i++) {
    diceTotal += rollDamageDie(rng, roll.diceSize)
  }
  return diceTotal + roll.modifier
}

export function applyResistance(
  amount: number,
  type: DamageType,
  profile: ResistanceProfile
): number {
  const status = profile[type]
  if (status === 'resistant') {
    return Math.floor(amount / 2)
  }
  if (status === 'vulnerable') {
    return amount * 2
  }
  return amount
}
