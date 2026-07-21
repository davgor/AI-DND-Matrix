/** @vitest-environment happy-dom */
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PlayLogEntry } from '../../../../main/narrationLog'
import { DmExpositionPanel } from '../DmExpositionPanel'
import { INCOMING_HIGHLIGHT_CLASS } from './index'
import { dmEntry, mountRoot, unmountRoot } from './incomingHighlightTestUtils'

describe('setting feed: no glow on hydrate', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('does not glow hydrated setting lines on mount', () => {
    act(() => {
      root.render(
        <DmExpositionPanel
          entries={[dmEntry({ id: 's1', text: 'Old setting.', sceneSetting: true })]}
          sceneContext={{}}
          expositionStatus={{ state: 'idle', errorMessage: null }}
          onRetryExposition={() => {}}
          showRolls={false}
          lastCheck={null}
        />
      )
    })
    expect(container.querySelector('[data-entry-id="s1"]')?.className).not.toContain(
      INCOMING_HIGHLIGHT_CLASS
    )
  })
})

describe('setting feed: glow on new setting only', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  function renderPanel(entries: PlayLogEntry[]): void {
    act(() => {
      root.render(
        <DmExpositionPanel
          entries={entries}
          sceneContext={{}}
          expositionStatus={{ state: 'idle', errorMessage: null }}
          onRetryExposition={() => {}}
          showRolls={false}
          lastCheck={null}
        />
      )
    })
  }

  it('highlights a newly appended setting entry and not a normal DM line', () => {
    renderPanel([dmEntry({ id: 's1', text: 'Old setting.', sceneSetting: true })])
    renderPanel([
      dmEntry({ id: 's1', text: 'Old setting.', sceneSetting: true }),
      dmEntry({ id: 's2', text: 'New setting.', sceneSetting: true }),
      dmEntry({ id: 'n1', text: 'Ordinary narration.' })
    ])
    expect(container.querySelector('[data-entry-id="s1"]')?.className).not.toContain(
      INCOMING_HIGHLIGHT_CLASS
    )
    expect(container.querySelector('[data-entry-id="s2"]')?.className).toContain(
      INCOMING_HIGHLIGHT_CLASS
    )
    expect(container.querySelector('[data-entry-id="n1"]')?.className).not.toContain(
      INCOMING_HIGHLIGHT_CLASS
    )
  })
})
