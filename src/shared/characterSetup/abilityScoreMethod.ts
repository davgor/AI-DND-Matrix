import { resolvePointBuy, resolveStandardArray, type AbilityScores } from '../../engine/abilities'

export type AbilityScoreMethod = 'pointBuy' | 'standardArray' | 'roll'

const METHODS: readonly AbilityScoreMethod[] = ['pointBuy', 'standardArray', 'roll']

export function isAbilityScoreMethod(value: unknown): value is AbilityScoreMethod {
  return typeof value === 'string' && METHODS.includes(value as AbilityScoreMethod)
}

export function inferAbilityScoreMethod(scores: AbilityScores): AbilityScoreMethod {
  if (resolveStandardArray(scores).valid) {
    return 'standardArray'
  }
  if (!resolvePointBuy(scores).valid) {
    return 'roll'
  }
  return 'pointBuy'
}

export function extractAbilityScoreMethod(stats: Record<string, unknown>): AbilityScoreMethod | null {
  return isAbilityScoreMethod(stats.abilityScoreMethod) ? stats.abilityScoreMethod : null
}

export function resolveAbilityScoreMethod(
  stats: Record<string, unknown>,
  scores: AbilityScores
): AbilityScoreMethod {
  return extractAbilityScoreMethod(stats) ?? inferAbilityScoreMethod(scores)
}
