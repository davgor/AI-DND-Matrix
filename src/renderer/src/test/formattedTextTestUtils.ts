import type { JSX } from 'react'

function isRenderableChild(
  child: unknown
): child is JSX.Element | string {
  return child !== undefined && child !== null && typeof child !== 'boolean'
}

function collectFromChildren(children: unknown, types: string[]): void {
  if (children === undefined || children === null) {
    return
  }
  if (typeof children === 'string') {
    return
  }
  if (Array.isArray(children)) {
    for (const child of children) {
      if (isRenderableChild(child)) {
        types.push(...collectEmphasisTypes(child))
      }
    }
    return
  }
  if (isRenderableChild(children)) {
    types.push(...collectEmphasisTypes(children))
  }
}

export function collectEmphasisTypes(node: JSX.Element | string | null | undefined): string[] {
  if (node === undefined || node === null || typeof node === 'string') {
    return []
  }
  const types: string[] = []
  if (node.type === 'em' || node.type === 'strong') {
    types.push(node.type as string)
  }
  collectFromChildren(node.props.children, types)
  return types
}

export function hasEmphasisTypes(node: JSX.Element, expected: Array<'em' | 'strong'>): boolean {
  const types = collectEmphasisTypes(node)
  return expected.every((type) => types.includes(type))
}

export function elementTypes(node: JSX.Element): string[] {
  return collectEmphasisTypes(node)
}
