import type { ReactElement, ReactNode } from 'react'

export function isElement(node: ReactNode): node is ReactElement {
  return typeof node === 'object' && node !== null && 'props' in node
}

export function walkNodes(node: ReactNode, visit: (element: ReactElement) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) {
      walkNodes(child, visit)
    }
    return
  }
  if (!isElement(node)) {
    return
  }
  visit(node)
  walkNodes(node.props.children, visit)
}

export function collectText(node: ReactNode): string {
  if (Array.isArray(node)) {
    return node.map(collectText).join('')
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (!isElement(node)) {
    return ''
  }
  return collectText(node.props.children)
}

export function findByClassName(node: ReactNode, className: string): ReactElement | undefined {
  let match: ReactElement | undefined
  walkNodes(node, (element) => {
    if (!match && element.props.className?.includes(className)) {
      match = element
    }
  })
  return match
}

export function findComponent(node: ReactNode, component: unknown): ReactElement | undefined {
  let match: ReactElement | undefined
  walkNodes(node, (element) => {
    if (!match && element.type === component) {
      match = element
    }
  })
  return match
}

export function countClassName(node: ReactNode, className: string): number {
  let count = 0
  walkNodes(node, (element) => {
    if (element.props.className?.includes(className)) {
      count += 1
    }
  })
  return count
}
