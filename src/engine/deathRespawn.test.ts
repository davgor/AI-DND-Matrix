import { describe, expect, it } from 'vitest'
import { resolveRespawnDeath, type RespawnRules } from './deathRespawn'

describe('resolveRespawnDeath', () => {
  it('relocates and deducts cost with no limit configured', () => {
    const rules: RespawnRules = { location: 'temple-of-dawn', cost: 50 }
    const outcome = resolveRespawnDeath(rules, { currency: 200 })
    expect(outcome).toEqual({ mode: 'respawn', location: 'temple-of-dawn', currency: 150 })
  })

  it('decrements a remaining-uses counter when a limit is configured', () => {
    const rules: RespawnRules = { location: 'temple-of-dawn', cost: 50, limit: 2 }
    const outcome = resolveRespawnDeath(rules, { currency: 200 })
    expect(outcome).toEqual({
      mode: 'respawn',
      location: 'temple-of-dawn',
      currency: 150,
      remainingUses: 1
    })
  })

  it('falls back to legendary behavior once the limit is exhausted', () => {
    const rules: RespawnRules = { location: 'temple-of-dawn', cost: 50, limit: 1 }
    const first = resolveRespawnDeath(rules, { currency: 200 })
    expect(first).toMatchObject({ mode: 'respawn', remainingUses: 0 })

    const second = resolveRespawnDeath(rules, { currency: 200, remainingUses: 0 })
    expect(second).toEqual({ mode: 'legendary' })
  })
})
