import type { JSX } from 'react'

export function collectEmphasisTypes(node: JSX.Element | string): string[] {
  if (typeof node === 'string') {
    return []
  }
  const types: string[] = []
  if (node.type === 'em' || node.type === 'strong') {
    types.push(node.type as string)
  }
  const children = node.props.children
  if (children === undefined || children === null) {
    return types
  }
  if (typeof children === 'string') {
    return types
  }
  if (Array.isArray(children)) {
    for (const child of children) {
      types.push(...collectEmphasisTypes(child as JSX.Element | string))
    }
    return types
  }
  types.push(...collectEmphasisTypes(children as JSX.Element))
  return types
}

export function hasEmphasisTypes(node: JSX.Element, expected: Array<'em' | 'strong'>): boolean {
  const types = collectEmphasisTypes(node)
  return expected.every((type) => types.includes(type))
}

export function elementTypes(node: JSX.Element): string[] {
  return collectEmphasisTypes(node)
}
