/** @vitest-environment happy-dom */
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountRoot, unmountRoot } from '../playView/incomingHighlight/incomingHighlightTestUtils'
import { PlayShellErrorBoundary } from './PlayShellErrorBoundary'

function ThrowingChild(): JSX.Element {
  throw new Error('forced play crash')
}

describe('PlayShellErrorBoundary', () => {
  let container: HTMLDivElement
  let root: Root
  const onReturnToHub = vi.fn()

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    ;({ container, root } = mountRoot())
    onReturnToHub.mockReset()
  })

  afterEach(() => {
    unmountRoot(root, container)
    vi.restoreAllMocks()
  })

  it('shows fallback when a child throws and Return to Hub is callable', () => {
    act(() => {
      root.render(
        <PlayShellErrorBoundary onReturnToHub={onReturnToHub}>
          <ThrowingChild />
        </PlayShellErrorBoundary>
      )
    })

    expect(container.textContent).toContain('Play view interrupted')
    expect(container.textContent).toContain('Return to Hub')

    const hubButton = container.querySelector('button')
    expect(hubButton).not.toBeNull()
    act(() => {
      hubButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onReturnToHub).toHaveBeenCalledTimes(1)
  })

  it('renders children normally when no error is thrown', () => {
    act(() => {
      root.render(
        <PlayShellErrorBoundary onReturnToHub={onReturnToHub}>
          <p>Play ok</p>
        </PlayShellErrorBoundary>
      )
    })
    expect(container.textContent).toContain('Play ok')
    expect(container.textContent).not.toContain('Play view interrupted')
  })
})
