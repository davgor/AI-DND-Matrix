/** Shared helpers for d20 overlay surface tests. */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CheckSnapshot } from './d20OverlayLogic'

export function sampleCheck(
  partial?: Partial<NonNullable<CheckSnapshot>>
): NonNullable<CheckSnapshot> {
  return {
    roll: partial?.roll ?? 17,
    total: partial?.total ?? 19,
    dc: partial?.dc ?? 15,
    success: partial?.success ?? true
  }
}

export function mountRoot(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return { container, root: createRoot(container) }
}

export function unmountRoot(root: Root, container: HTMLDivElement): void {
  act(() => {
    root.unmount()
  })
  container.remove()
}
