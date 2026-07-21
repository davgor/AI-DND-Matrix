/** @vitest-environment happy-dom */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { D20Face } from './D20Face'
import { mountRoot, unmountRoot } from './d20OverlayTestUtils'
import type { Root } from 'react-dom/client'

describe('D20Face', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('renders the settled face number clearly', () => {
    act(() => {
      root.render(<D20Face face={17} />)
    })
    const el = container.querySelector('.d20-face')
    expect(el).not.toBeNull()
    expect(el?.textContent).toContain('17')
    expect(el?.getAttribute('role')).toBe('img')
    expect(el?.getAttribute('aria-label')).toBe('d20 showing 17')
  })

  it('clamps invalid faces and can hide accessibility announcement while tumbling', () => {
    act(() => {
      root.render(<D20Face face={99} tumbling />)
    })
    const el = container.querySelector('.d20-face')
    expect(el?.textContent).toContain('20')
    expect(el?.getAttribute('aria-hidden')).toBe('true')
    expect(el?.getAttribute('role')).toBeNull()
  })
})
