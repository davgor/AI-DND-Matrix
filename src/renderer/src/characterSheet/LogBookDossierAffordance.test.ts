import { describe, expect, it } from 'vitest'
import { logBookShowsDossierAffordance } from './LogBookDossierAffordance'

describe('logBookShowsDossierAffordance', () => {
  it('is true only for linked person entries with a handler', () => {
    const onOpen = (_npcId: string) => {}
    expect(logBookShowsDossierAffordance('person', 'npc-1', onOpen)).toBe(true)
    expect(logBookShowsDossierAffordance('place', 'npc-1', onOpen)).toBe(false)
    expect(logBookShowsDossierAffordance('person', null, onOpen)).toBe(false)
    expect(logBookShowsDossierAffordance('person', 'npc-1', undefined)).toBe(false)
  })
})
