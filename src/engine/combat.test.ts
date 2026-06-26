import { describe, expect, it } from 'vitest'
import { rollInitiative, startTurn, useAction } from './combat'

function fixedSequence(values: number[]): () => number {
  let index = 0
  return () => values[index++ % values.length]
}

describe('rollInitiative', () => {
  it('rolls once per combatant and orders by total descending', () => {
    const rng = fixedSequence([(10 - 1) / 20, (5 - 1) / 20])
    const order = rollInitiative(
      [
        { id: 'a', agilityScore: 10 },
        { id: 'b', agilityScore: 18 }
      ],
      rng
    )
    // a: 10 + 0 = 10, b: 5 + 4 = 9
    expect(order.map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  it('produces a stable order that does not change without re-rolling', () => {
    const rng = fixedSequence([(10 - 1) / 20, (5 - 1) / 20])
    const order = rollInitiative([{ id: 'a', agilityScore: 10 }], rng)
    expect(order).toEqual(order)
  })
})

describe('turn structure', () => {
  it('allows exactly one Action per turn', () => {
    const turn = useAction(startTurn())
    expect(turn.actionTaken).toBe(true)
  })

  it('rejects a second Action in the same turn', () => {
    const turn = useAction(startTurn())
    expect(() => useAction(turn)).toThrow('only one Action allowed per turn')
  })
})
