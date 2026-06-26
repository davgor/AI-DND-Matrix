import { abilityModifier } from './abilities'

export type Archetype = 'fighter' | 'rogue' | 'mage' | 'cleric' | 'ranger'

export const HIT_DIE_SIZE: Record<Archetype, number> = {
  fighter: 10,
  rogue: 8,
  mage: 6,
  cleric: 8,
  ranger: 10
}

function averageHitDie(dieSize: number): number {
  return Math.ceil((dieSize + 1) / 2)
}

export function computeHP(archetype: Archetype, level: number, bodyScore: number): number {
  const perLevel = averageHitDie(HIT_DIE_SIZE[archetype]) + abilityModifier(bodyScore)
  return perLevel * level
}
