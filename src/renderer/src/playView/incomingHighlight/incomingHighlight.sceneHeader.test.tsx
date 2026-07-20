/** @vitest-environment happy-dom */
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DmExpositionSceneHeader } from '../dmExpositionParts'
import { INCOMING_HIGHLIGHT_CLASS } from './index'
import { dmEntry, mountRoot, unmountRoot } from './incomingHighlightTestUtils'

describe('scene header: no glow on mount', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('does not glow on mount with an existing summary', () => {
    act(() => {
      root.render(
        <DmExpositionSceneHeader
          entries={[dmEntry({ id: '1', text: 'Torches flicker.', sceneSetting: true })]}
          sceneContext={{}}
          expositionStatus={{ state: 'idle', errorMessage: null }}
          onRetryExposition={() => {}}
        />
      )
    })
    expect(container.querySelector('.dm-exposition-scene')?.className).toBe('dm-exposition-scene')
  })
})

describe('scene header: glow on summary change', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('glows when rendered summary text changes', () => {
    act(() => {
      root.render(
        <DmExpositionSceneHeader
          entries={[dmEntry({ id: '1', text: 'Quiet hall.', sceneSetting: true })]}
          sceneContext={{}}
          expositionStatus={{ state: 'idle', errorMessage: null }}
          onRetryExposition={() => {}}
        />
      )
    })
    act(() => {
      root.render(
        <DmExpositionSceneHeader
          entries={[
            dmEntry({ id: '1', text: 'Quiet hall.', sceneSetting: true }),
            dmEntry({ id: '2', text: 'Wind howls through the arch.', sceneSetting: true })
          ]}
          sceneContext={{}}
          expositionStatus={{ state: 'idle', errorMessage: null }}
          onRetryExposition={() => {}}
        />
      )
    })
    expect(container.querySelector('.dm-exposition-scene')?.className).toContain(
      INCOMING_HIGHLIGHT_CLASS
    )
  })
})

describe('scene header: no glow when summary unchanged', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('does not re-glow when summary text is unchanged', () => {
    act(() => {
      root.render(
        <DmExpositionSceneHeader
          entries={[dmEntry({ id: '1', text: 'Quiet hall.', sceneSetting: true })]}
          sceneContext={{}}
          expositionStatus={{ state: 'idle', errorMessage: null }}
          onRetryExposition={() => {}}
        />
      )
    })
    act(() => {
      root.render(
        <DmExpositionSceneHeader
          entries={[
            dmEntry({ id: '1', text: 'Quiet hall.', sceneSetting: true }),
            dmEntry({ id: '2', text: 'You notice dust motes.' })
          ]}
          sceneContext={{}}
          expositionStatus={{ state: 'idle', errorMessage: null }}
          onRetryExposition={() => {}}
        />
      )
    })
    expect(container.querySelector('.dm-exposition-scene')?.className).not.toContain(
      INCOMING_HIGHLIGHT_CLASS
    )
  })
})
