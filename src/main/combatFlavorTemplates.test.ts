import { afterEach, describe, expect, it } from 'vitest'
import { TEMPERAMENTS } from '../shared/alignment/types'
import {
  buildNpcCombatFlavor,
  buildPartyMemberCombatFlavor,
  combatLlmFlavorEnabled
} from './combatFlavorTemplates'

const ORIGINAL_FLAG = process.env['COMBAT_LLM_FLAVOR']

afterEach(() => {
  if (ORIGINAL_FLAG === undefined) {
    delete process.env['COMBAT_LLM_FLAVOR']
  } else {
    process.env['COMBAT_LLM_FLAVOR'] = ORIGINAL_FLAG
  }
})

describe('combatLlmFlavorEnabled', () => {
  it('is off by default', () => {
    delete process.env['COMBAT_LLM_FLAVOR']
    expect(combatLlmFlavorEnabled()).toBe(false)
  })

  it('is on only for the exact string "true"', () => {
    process.env['COMBAT_LLM_FLAVOR'] = 'true'
    expect(combatLlmFlavorEnabled()).toBe(true)
    process.env['COMBAT_LLM_FLAVOR'] = '1'
    expect(combatLlmFlavorEnabled()).toBe(false)
    process.env['COMBAT_LLM_FLAVOR'] = 'false'
    expect(combatLlmFlavorEnabled()).toBe(false)
  })
})

describe('buildNpcCombatFlavor: speaking NPCs', () => {
  const base = {
    npcName: 'Goblin',
    temperament: 'aggressive' as const,
    disposition: 'hostile',
    canSpeak: true
  }

  it('produces dialogue reactionKind with unwrapped text', () => {
    const flavor = buildNpcCombatFlavor({ ...base, hit: true })
    expect(flavor.reactionKind).toBe('dialogue')
    expect(flavor.text.length).toBeGreaterThan(0)
    expect(flavor.text.startsWith('**')).toBe(false)
  })

  it('distinguishes hit from miss', () => {
    const hit = buildNpcCombatFlavor({ ...base, hit: true })
    const miss = buildNpcCombatFlavor({ ...base, hit: false })
    expect(hit.text).not.toBe(miss.text)
  })

  it('distinguishes hostile disposition from a pressed (defensive) one', () => {
    const hostile = buildNpcCombatFlavor({ ...base, hit: true })
    const pressed = buildNpcCombatFlavor({ ...base, disposition: 'friendly but cornered', hit: true })
    expect(hostile.text).not.toBe(pressed.text)
  })

  it('matches the hostile bucket case-insensitively anywhere in the disposition', () => {
    const explicit = buildNpcCombatFlavor({ ...base, hit: true })
    const provoked = buildNpcCombatFlavor({
      ...base,
      disposition: "Hostile — provoked by the player's attack",
      hit: true
    })
    expect(provoked.text).toBe(explicit.text)
  })
})

describe('buildNpcCombatFlavor: non-speaking NPCs', () => {
  const base = {
    npcName: 'Wolf',
    temperament: 'territorial' as const,
    disposition: 'hostile',
    canSpeak: false
  }

  it('produces action reactionKind wrapped in ** markers and naming the NPC', () => {
    const flavor = buildNpcCombatFlavor({ ...base, hit: true })
    expect(flavor.reactionKind).toBe('action')
    expect(flavor.text.startsWith('**')).toBe(true)
    expect(flavor.text.endsWith('**')).toBe(true)
    expect(flavor.text).toContain('Wolf')
  })

  it('contains no quoted dialogue', () => {
    const hit = buildNpcCombatFlavor({ ...base, hit: true })
    const miss = buildNpcCombatFlavor({ ...base, hit: false })
    expect(hit.text).not.toContain('"')
    expect(miss.text).not.toContain('"')
  })
})

describe('buildNpcCombatFlavor: coverage and determinism', () => {
  const combinations = TEMPERAMENTS.flatMap((temperament) =>
    [true, false].flatMap((canSpeak) =>
      ['hostile', 'wary'].flatMap((disposition) =>
        [true, false].map((hit) => ({ npcName: 'Foe', temperament, disposition, canSpeak, hit }))
      )
    )
  )

  it('produces a distinct deterministic line for every key combination', () => {
    const seen = new Set<string>()
    for (const input of combinations) {
      const first = buildNpcCombatFlavor(input)
      expect(first.text.trim().length).toBeGreaterThan(4)
      expect(first.reactionKind).toBe(input.canSpeak ? 'dialogue' : 'action')
      expect(buildNpcCombatFlavor(input)).toEqual(first)
      seen.add(`${first.reactionKind}:${first.text}`)
    }
    expect(seen.size).toBe(combinations.length)
  })
})

describe('buildPartyMemberCombatFlavor', () => {
  it('produces deterministic plain prose naming the member', () => {
    const first = buildPartyMemberCombatFlavor('Brom')
    expect(first).toContain('Brom')
    expect(first).not.toContain('**')
    expect(first).not.toContain('{name}')
    expect(buildPartyMemberCombatFlavor('Brom')).toBe(first)
  })
})
