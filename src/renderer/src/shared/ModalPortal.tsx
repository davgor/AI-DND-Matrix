import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/** Render modal UI on `document.body` so side-pane overflow cannot clip it. */
export function ModalPortal(props: { children: ReactNode }): JSX.Element {
  return createPortal(props.children, document.body)
}
