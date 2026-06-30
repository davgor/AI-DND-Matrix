import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as devBuild from '../dev/isRendererDevBuild'
import { GenerateRegionDialog } from './GenerateRegionDialog'

beforeEach(() => {
  vi.spyOn(devBuild, 'isRendererDevBuild').mockReturnValue(true)
})

function isJsxElement(node: unknown): node is JSX.Element {
  return typeof node === 'object' && node !== null && 'props' in node
}

function expandNode(node: unknown): unknown {
  if (typeof node === 'function') {
    return expandNode(node({}))
  }
  if (!isJsxElement(node)) {
    return node
  }
  if (typeof node.type === 'function') {
    return expandNode(node.type(node.props))
  }
  const children = node.props.children
  if (children === undefined) {
    return node
  }
  const expandedChildren = Array.isArray(children)
    ? children.map((child) => expandNode(child))
    : expandNode(children)
  return { ...node, props: { ...node.props, children: expandedChildren } }
}

function collectElements(node: unknown): JSX.Element[] {
  const expanded = expandNode(node)
  if (!isJsxElement(expanded)) {
    return []
  }
  const children = expanded.props.children
  const nested = Array.isArray(children)
    ? children.flatMap((child) => collectElements(child))
    : collectElements(children)
  return [expanded, ...nested]
}

describe('GenerateRegionDialog random dice', () => {
  it('fills only the seed field when the seed dice is clicked', () => {
    const onSeedChange = vi.fn()
    const onNpcCountChange = vi.fn()
    const node = GenerateRegionDialog({
      seedPrompt: '',
      npcCount: 3,
      npcCountBounds: { min: 0, max: 10 },
      generating: false,
      generateError: null,
      onSeedChange,
      onNpcCountChange,
      onClose: () => {},
      onSubmit: () => {}
    })

    const seedDice = collectElements(node).find(
      (element) =>
        element.props?.className === 'field-random-dice' &&
        element.props['aria-label'] === 'Random region seed'
    )
    seedDice?.props.onClick()

    expect(onSeedChange).toHaveBeenCalledTimes(1)
    expect(onSeedChange.mock.calls[0]?.[0]?.trim().length).toBeGreaterThan(0)
    expect(onNpcCountChange).not.toHaveBeenCalled()
  })
})
