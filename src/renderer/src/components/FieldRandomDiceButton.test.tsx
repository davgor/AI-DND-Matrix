import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as devBuild from '../dev/isRendererDevBuild'
import { FieldRandomDiceButton } from './FieldRandomDiceButton'

beforeEach(() => {
  vi.spyOn(devBuild, 'isRendererDevBuild').mockReturnValue(true)
})

describe('FieldRandomDiceButton', () => {
  it('renders a dice icon with an accessible label in dev builds', () => {
    const onRandomize = vi.fn()
    const node = FieldRandomDiceButton({
      ariaLabel: 'Random campaign premise',
      onRandomize
    })

    expect(node).not.toBeNull()
    expect(node?.props.className).toBe('field-random-dice')
    expect(node?.props['aria-label']).toBe('Random campaign premise')
    expect(node?.props.children).toBeTruthy()
    node?.props.onClick()
    expect(onRandomize).toHaveBeenCalledTimes(1)
  })

  it('respects disabled state', () => {
    const node = FieldRandomDiceButton({
      ariaLabel: 'Random region count',
      disabled: true,
      onRandomize: () => {}
    })

    expect(node?.props.disabled).toBe(true)
  })

  it('returns null outside dev builds', () => {
    vi.mocked(devBuild.isRendererDevBuild).mockReturnValue(false)

    const node = FieldRandomDiceButton({
      ariaLabel: 'Random campaign premise',
      onRandomize: () => {}
    })

    expect(node).toBeNull()
  })
})
