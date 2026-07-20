/** @vitest-environment happy-dom */
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayLogEntry } from '../../../../main/narrationLog'
import { PlayerActionPanel } from '../PlayerActionPanel'
import { INCOMING_HIGHLIGHT_CLASS } from './index'
import { mountRoot, socialEntry, unmountRoot } from './incomingHighlightTestUtils'

function bubbleClass(container: HTMLElement, id: string): string {
  return container.querySelector(`[data-entry-id="${id}"] .social-message-bubble`)?.className ?? ''
}

function renderSocial(root: Root, entries: PlayLogEntry[]): void {
  act(() => {
    root.render(
      <PlayerActionPanel
        entries={entries}
        inputValue=""
        onInputChange={() => {}}
        onSubmit={() => {}}
        submitting={false}
      />
    )
  })
}

const seededSocial: PlayLogEntry[] = [
  socialEntry({ id: 'p1', speaker: 'player', text: 'Hello', playerLineKind: 'raw' }),
  socialEntry({
    id: 'n1',
    speaker: 'npc',
    text: 'Welcome.',
    reactionKind: 'dialogue',
    speakerName: 'Filo'
  })
]

const appendedSocial: PlayLogEntry[] = [
  ...seededSocial,
  socialEntry({
    id: 'n2',
    speaker: 'npc',
    text: 'Stay a while.',
    reactionKind: 'dialogue',
    speakerName: 'Filo'
  }),
  socialEntry({
    id: 'a1',
    speaker: 'npc',
    text: 'The wolf lunges.',
    reactionKind: 'action',
    speakerName: 'Wolf'
  }),
  socialEntry({ id: 'p2', speaker: 'player', text: 'I sit.', playerLineKind: 'raw' })
]

function stubResizeObserver(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  )
}

describe('social: mount has no NPC glow', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
    stubResizeObserver()
  })

  afterEach(() => {
    unmountRoot(root, container)
    vi.unstubAllGlobals()
  })

  it('does not highlight hydrated NPC dialogue on mount', () => {
    renderSocial(root, seededSocial)
    expect(bubbleClass(container, 'n1')).not.toContain(INCOMING_HIGHLIGHT_CLASS)
  })
})

describe('social: live NPC dialogue glows', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ container, root } = mountRoot())
    stubResizeObserver()
  })

  afterEach(() => {
    unmountRoot(root, container)
    vi.unstubAllGlobals()
  })

  it('highlights new dialogue and skips player and action lines', () => {
    renderSocial(root, seededSocial)
    renderSocial(root, appendedSocial)
    expect(bubbleClass(container, 'n2')).toContain(INCOMING_HIGHLIGHT_CLASS)
    expect(bubbleClass(container, 'a1')).not.toContain(INCOMING_HIGHLIGHT_CLASS)
    expect(bubbleClass(container, 'p2')).not.toContain(INCOMING_HIGHLIGHT_CLASS)
  })
})
