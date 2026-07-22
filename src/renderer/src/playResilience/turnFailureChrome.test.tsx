/** @vitest-environment happy-dom */
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DmExpositionSceneHeader } from '../playView/dmExpositionParts'
import { mountRoot, unmountRoot } from '../playView/incomingHighlight/incomingHighlightTestUtils'

describe('DmExpositionSceneHeader retryable turn failure', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('shows Retry when retryable and Abort always on error state', () => {
    const onRetry = vi.fn()
    const onAbort = vi.fn()
    act(() => {
      root.render(
        <DmExpositionSceneHeader
          entries={[]}
          sceneContext={{}}
          expositionStatus={{ state: 'error', errorMessage: 'Engine offline.' }}
          onRetryExposition={onRetry}
          onAbortTurnFailure={onAbort}
          turnFailureRetryable
        />
      )
    })
    const buttons = container.querySelectorAll('.dm-exposition-error button')
    expect(buttons).toHaveLength(2)
    act(() => {
      buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onAbort).toHaveBeenCalledTimes(1)
  })
})

describe('DmExpositionSceneHeader non-retryable turn failure', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('hides Retry when failure is not retryable', () => {
    act(() => {
      root.render(
        <DmExpositionSceneHeader
          entries={[]}
          sceneContext={{}}
          expositionStatus={{ state: 'error', errorMessage: 'Could not finish.' }}
          onRetryExposition={() => {}}
          onAbortTurnFailure={() => {}}
          turnFailureRetryable={false}
        />
      )
    })
    expect(container.querySelectorAll('.dm-exposition-error button')).toHaveLength(1)
    expect(container.textContent).toContain('Abort')
    expect(container.textContent).not.toContain('Retry')
  })
})
