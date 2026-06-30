import { describe, expect, it } from 'vitest'
import { resolveFleeDisengage } from './fleeDisengage'

function scriptedRng(rolls: number[]): () => number {
  let index = 0
  return () => {
    const roll = rolls[index] ?? rolls[rolls.length - 1] ?? 0
    index += 1
    return roll
  }
}

describe('resolveFleeDisengage', () => {
  it('succeeds when player total beats hostile total', () => {
    const result = resolveFleeDisengage({
      rng: scriptedRng([0.95, 0.05]),
      playerAgilityScore: 14,
      playerProficient: true,
      proficiencyBonus: 2,
      hostileAgilityScore: 10
    })
    expect(result.playerRoll).toBe(20)
    expect(result.hostileRoll).toBe(2)
    expect(result.success).toBe(true)
    expect(result.margin).toBeGreaterThan(0)
  })

  it('fails when player total is lower', () => {
    const result = resolveFleeDisengage({
      rng: scriptedRng([0, 0.95]),
      playerAgilityScore: 10,
      playerProficient: false,
      proficiencyBonus: 2,
      hostileAgilityScore: 16
    })
    expect(result.success).toBe(false)
    expect(result.margin).toBeLessThan(0)
  })

  it('fails on a tie — defender (hostile) wins ties', () => {
    const result = resolveFleeDisengage({
      rng: scriptedRng([0.45, 0.45]),
      playerAgilityScore: 12,
      playerProficient: false,
      proficiencyBonus: 2,
      hostileAgilityScore: 12
    })
    expect(result.playerTotal).toBe(result.hostileTotal)
    expect(result.success).toBe(false)
    expect(result.margin).toBe(0)
  })
})
