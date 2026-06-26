export interface RestResult {
  hpRestored: number
  inGameDateAdvanceDays: number
}

export const SHORT_REST_HP_FRACTION = 0.5

export function resolveShortRest(currentHP: number, maxHP: number): RestResult {
  const missing = maxHP - currentHP
  const restored = Math.min(missing, Math.ceil(maxHP * SHORT_REST_HP_FRACTION))
  return { hpRestored: restored, inGameDateAdvanceDays: 0 }
}

export function resolveLongRest(currentHP: number, maxHP: number): RestResult {
  return { hpRestored: maxHP - currentHP, inGameDateAdvanceDays: 1 }
}
