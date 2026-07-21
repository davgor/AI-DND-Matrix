/** @vitest-environment happy-dom */
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { D20Overlay } from './D20Overlay'
import { totalOverlayDurationMs } from './d20OverlayLogic'
import { mountRoot, sampleCheck, unmountRoot } from './d20OverlayTestUtils'

function setupOverlayTest(): { container: HTMLDivElement; root: Root } {
  vi.useFakeTimers()
  return mountRoot()
}

function teardownOverlayTest(root: Root, container: HTMLDivElement): void {
  unmountRoot(root, container)
  vi.useRealTimers()
}

describe('D20Overlay wiring', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = setupOverlayTest())
  })

  afterEach(() => {
    teardownOverlayTest(root, container)
  })

  it('does not fire on mount with an existing lastCheck', () => {
    act(() => {
      root.render(<D20Overlay lastCheck={sampleCheck()} showRolls />)
    })
    expect(container.querySelector('.d20-overlay')).toBeNull()
  })

  it('fires when lastCheck changes after mount and shows the natural roll', () => {
    act(() => {
      root.render(<D20Overlay lastCheck={null} showRolls />)
    })
    act(() => {
      root.render(<D20Overlay lastCheck={sampleCheck({ roll: 14 })} showRolls />)
    })
    const overlay = container.querySelector('.d20-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay?.textContent).toContain('14')
    expect((overlay as HTMLElement).style.pointerEvents).toBe('none')
  })

  it('does not flash when a turn has no check', () => {
    act(() => {
      root.render(<D20Overlay lastCheck={null} showRolls />)
    })
    act(() => {
      root.render(<D20Overlay lastCheck={null} showRolls />)
    })
    expect(container.querySelector('.d20-overlay')).toBeNull()
  })
})

describe('D20Overlay replace and clear', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = setupOverlayTest())
  })

  afterEach(() => {
    teardownOverlayTest(root, container)
  })

  it('replaces in-flight animation when a new check arrives', () => {
    act(() => {
      root.render(<D20Overlay lastCheck={null} showRolls />)
    })
    act(() => {
      root.render(<D20Overlay lastCheck={sampleCheck({ roll: 4 })} showRolls />)
    })
    expect(container.querySelector('.d20-overlay')?.getAttribute('data-d20-play')).toBe('1')

    act(() => {
      root.render(
        <D20Overlay lastCheck={sampleCheck({ roll: 19, total: 21, success: true })} showRolls />
      )
    })
    const overlay = container.querySelector('.d20-overlay')
    expect(overlay?.getAttribute('data-d20-play')).toBe('2')
    expect(overlay?.textContent).toContain('19')
  })

  it('clears the overlay after the total duration', () => {
    act(() => {
      root.render(<D20Overlay lastCheck={null} showRolls />)
    })
    act(() => {
      root.render(<D20Overlay lastCheck={sampleCheck()} showRolls />)
    })
    act(() => {
      vi.advanceTimersByTime(totalOverlayDurationMs())
    })
    expect(container.querySelector('.d20-overlay')).toBeNull()
  })

  it('uses brief-then-clear face class when Show rolls is off', () => {
    act(() => {
      root.render(<D20Overlay lastCheck={null} showRolls={false} />)
    })
    act(() => {
      root.render(<D20Overlay lastCheck={sampleCheck({ roll: 11 })} showRolls={false} />)
    })
    expect(container.querySelector('.d20-face--brief')).not.toBeNull()
    expect(container.querySelector('.d20-face')?.textContent).toContain('11')
  })
})

describe('D20Overlay reduced motion', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null
    }))
    ;({ container, root } = mountRoot())
  })

  afterEach(() => {
    teardownOverlayTest(root, container)
  })

  it('uses the reduced-motion path and data attribute', () => {
    act(() => {
      root.render(<D20Overlay lastCheck={null} showRolls />)
    })
    act(() => {
      root.render(<D20Overlay lastCheck={sampleCheck({ roll: 8 })} showRolls />)
    })
    const overlay = container.querySelector('.d20-overlay')
    expect(overlay?.getAttribute('data-d20-reduced')).toBe('true')
    expect(container.querySelector('.d20-overlay-die--reduced')).not.toBeNull()
    expect(overlay?.textContent).toContain('8')
  })
})
