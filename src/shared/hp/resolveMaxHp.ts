import { computeMaxHpFromHitDice } from '../../engine/hp'
import { hasAuthoritativeMaxHp, parseCharacterHpStats } from './types'

export function resolveCharacterMaxHp(character: {
  hp: number
  level: number
  characterClass: string
  stats: unknown
}): number {
  const hpStats = parseCharacterHpStats(character.stats)
  if (hasAuthoritativeMaxHp(hpStats)) {
    return hpStats!.maxHp!
  }
  if (hpStats?.hitDieRolls && hpStats.hitDieRolls.length > 0) {
    const bodyScore = hpStats.abilityScores?.body ?? 10
    return computeMaxHpFromHitDice(bodyScore, hpStats.hitDieRolls)
  }
  if (character.hp > 0) {
    return character.hp
  }
  return 0
}
