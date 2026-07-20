/** @vitest-environment happy-dom */
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PendingLevelUpResponse } from '../../../main/progressionIpc'
import { LevelUpModalBody } from './LevelUpModalBody'
import { mountRoot, unmountRoot } from './d20Overlay/d20OverlayTestUtils'

function pendingWithoutPerks(): PendingLevelUpResponse {
  return {
    characterId: 'char-1',
    targetLevel: 2,
    narrationText: 'You grow stronger.',
    perks: undefined as unknown as PendingLevelUpResponse['perks']
  }
}

describe('LevelUpModalBody blank-screen crash', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('does not throw when pending.perks is undefined (corrupted queue)', () => {
    expect(() => {
      act(() => {
        root.render(
          <LevelUpModalBody
            pending={pendingWithoutPerks()}
            selectedId={null}
            submitting={false}
            onSelect={() => {}}
            onConfirm={() => {}}
          />
        )
      })
    }).not.toThrow()
    expect(container.querySelector('.level-up-modal')).not.toBeNull()
    expect(container.querySelector('#level-up-title')?.textContent).toBe('Level 2')
  })
})
