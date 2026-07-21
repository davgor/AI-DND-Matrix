/** @vitest-environment happy-dom */
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Character } from '../../../db/repositories/characters'
import { PlaySheetCharacterTab } from './playSheetRailTabs'
import { mountRoot, unmountRoot } from './d20Overlay/d20OverlayTestUtils'

function characterWithNullStats(): Character {
  return {
    id: 'char-1',
    campaignId: 'camp-1',
    name: 'Kael',
    characterClass: 'fighter',
    stats: null as unknown as Record<string, unknown>,
    inventory: [],
    hp: 10,
    xp: 0,
    level: 1,
    currency: 0,
    kind: 'player',
    sourceNpcId: null,
    portraitPath: null,
    sheetBackgroundPath: null,
    identityWho: null,
    identityWhy: null,
    identityWhere: null,
    identityWhat: null,
    openingScene: null,
    guidedCreationPhase: 'complete',
    alignment: null,
    pendingAlignmentShift: null,
    lifeStatus: 'alive',
    diedAt: null,
    deathCause: null,
    obituary: null,
    ownerPlayerCharacterId: null,
    raceKey: null,
    backgroundKey: null,
    backgroundStory: null
  }
}

describe('PlaySheetCharacterTab blank-screen crash', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('does not throw when character.stats is null', () => {
    expect(() => {
      act(() => {
        root.render(<PlaySheetCharacterTab character={characterWithNullStats()} />)
      })
    }).not.toThrow()
    expect(container.textContent).toContain('Kael')
  })
})
