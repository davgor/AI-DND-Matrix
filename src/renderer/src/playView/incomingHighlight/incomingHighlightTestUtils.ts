/** Shared helpers for incoming-highlight surface tests. */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { PlayLogEntry } from '../../../../main/narrationLog'

export function dmEntry(
  partial: Partial<PlayLogEntry> & Pick<PlayLogEntry, 'id' | 'text'>
): PlayLogEntry {
  return {
    timestamp: partial.timestamp ?? 't',
    speaker: 'dm',
    sceneSetting: partial.sceneSetting,
    ...partial
  }
}

export function socialEntry(
  partial: Partial<PlayLogEntry> & Pick<PlayLogEntry, 'id' | 'speaker' | 'text'>
): PlayLogEntry {
  return {
    timestamp: partial.timestamp ?? 't',
    reactionKind: partial.reactionKind,
    playerLineKind: partial.playerLineKind,
    speakerName: partial.speakerName,
    ...partial
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
