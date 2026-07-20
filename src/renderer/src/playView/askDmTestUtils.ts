export function collectText(node: unknown): string {
  if (node == null || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(collectText).join('')
  }
  if (typeof node === 'object' && node !== null && 'props' in node) {
    return collectText((node as { props?: { children?: unknown } }).props?.children)
  }
  return ''
}

export type ButtonEntry = { label: string; disabled?: boolean; onClick?: () => void }

export function flattenJsx(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(flattenJsx)
  }
  if (typeof node !== 'object' || node === null || !('type' in node) || !('props' in node)) {
    return node
  }
  const element = node as { type: unknown; props: Record<string, unknown> }
  if (typeof element.type === 'function') {
    return flattenJsx(element.type(element.props))
  }
  const children = element.props.children
  if (children === undefined) {
    return element
  }
  return {
    ...element,
    props: {
      ...element.props,
      children: flattenJsx(children)
    }
  }
}

function readButton(node: {
  type?: unknown
  props?: { children?: unknown; disabled?: boolean; onClick?: () => void }
}): ButtonEntry[] {
  if (node.type !== 'button') {
    return collectButtons(node.props?.children)
  }
  return [
    {
      label: collectText(node.props?.children),
      disabled: node.props?.disabled,
      onClick: node.props?.onClick
    },
    ...collectButtons(node.props?.children)
  ]
}

function collectButtons(node: unknown): ButtonEntry[] {
  if (Array.isArray(node)) {
    return node.flatMap(collectButtons)
  }
  if (typeof node !== 'object' || node === null || !('type' in node) || !('props' in node)) {
    return []
  }
  return readButton(
    node as { type?: unknown; props?: { children?: unknown; disabled?: boolean; onClick?: () => void } }
  )
}

export function buttonEntries(node: unknown): ButtonEntry[] {
  return collectButtons(flattenJsx(node))
}
