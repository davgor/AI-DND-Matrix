/** @vitest-environment happy-dom */
import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SocialMessage,
  buildSocialAvatarContent,
  socialAvatarInitial,
  socialFaceTokenSrc,
  socialMessageSide,
  socialSpeakerName
} from './socialStreamParts'
import { mountRoot, unmountRoot } from './incomingHighlight/incomingHighlightTestUtils'

import type { PlayLogEntry } from '../../../main/narrationLog'

function entry(
  partial: Partial<PlayLogEntry> & Pick<PlayLogEntry, 'speaker' | 'text'>
): PlayLogEntry {
  return {
    id: partial.id ?? '1',
    timestamp: partial.timestamp ?? 't',
    speaker: partial.speaker,
    text: partial.text,
    reactionKind: partial.reactionKind,
    playerLineKind: partial.playerLineKind,
    speakerName: partial.speakerName,
    npcId: partial.npcId,
    faceTokenPath: partial.faceTokenPath
  }
}

function renderSocialMessage(
  root: Root,
  props: Parameters<typeof SocialMessage>[0]
): void {
  act(() => {
    root.render(createElement(SocialMessage, props))
  })
}

describe('socialSpeakerName', () => {
  it('labels the player as You and falls back for unnamed speakers', () => {
    expect(socialSpeakerName(entry({ speaker: 'player', text: 'Hi' }))).toBe('You')
    expect(socialSpeakerName(entry({ speaker: 'npc', text: 'Hi', speakerName: 'Filo' }))).toBe('Filo')
    expect(socialSpeakerName(entry({ speaker: 'npc', text: 'Hi' }))).toBe('NPC')
    expect(socialSpeakerName(entry({ speaker: 'partyMember', text: 'Hi' }))).toBe('Ally')
  })
})

describe('socialAvatarInitial', () => {
  it('uses the first letter of the speaker name', () => {
    expect(socialAvatarInitial('Filo')).toBe('F')
    expect(socialAvatarInitial('  naofumi ')).toBe('N')
    expect(socialAvatarInitial('')).toBe('?')
  })
})

describe('socialFaceTokenSrc', () => {
  it('builds a file URL when a path is present', () => {
    expect(socialFaceTokenSrc('/data/npc-face-tokens/camp/npc.png')).toBe(
      'file:///data/npc-face-tokens/camp/npc.png'
    )
  })

  it('returns undefined when the path is missing', () => {
    expect(socialFaceTokenSrc(null)).toBeUndefined()
    expect(socialFaceTokenSrc(undefined)).toBeUndefined()
  })
})

describe('buildSocialAvatarContent', () => {
  it('prefers a face token image when a path is present', () => {
    expect(
      buildSocialAvatarContent({
        name: 'Filo',
        faceTokenPath: 'C:/data/npc-face-tokens/camp/npc-filo.png'
      })
    ).toEqual({
      kind: 'image',
      src: 'file://C:/data/npc-face-tokens/camp/npc-filo.png'
    })
  })

  it('falls back to the letter initial when no path is available', () => {
    expect(buildSocialAvatarContent({ name: 'Filo' })).toEqual({
      kind: 'initial',
      text: 'F'
    })
  })

  it('falls back to the letter initial after an image load failure', () => {
    expect(
      buildSocialAvatarContent({
        name: 'Filo',
        faceTokenPath: 'C:/missing/npc-filo.png',
        imageFailed: true
      })
    ).toEqual({
      kind: 'initial',
      text: 'F'
    })
  })
})

describe('socialMessageSide', () => {
  it('places player messages on the outgoing side', () => {
    expect(socialMessageSide(entry({ speaker: 'player', text: 'Hi' }))).toBe('player')
    expect(socialMessageSide(entry({ speaker: 'npc', text: 'Hi', speakerName: 'Filo' }))).toBe('other')
  })
})

describe('SocialMessage avatar rendering', () => {
  let root: Root
  let container: HTMLDivElement

  beforeEach(() => {
    ;({ root, container } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('renders an avatar bubble for NPC lines and not for player lines', () => {
    renderSocialMessage(root, {
      entry: entry({ speaker: 'npc', text: 'Hey!', speakerName: 'Filo', reactionKind: 'dialogue' })
    })
    expect(container.querySelector('.social-message--other .social-avatar')?.textContent).toBe('F')

    unmountRoot(root, container)
    ;({ root, container } = mountRoot())
    renderSocialMessage(root, {
      entry: entry({ speaker: 'player', text: 'Hello', playerLineKind: 'raw' })
    })
    expect(container.querySelector('.social-message--player .social-avatar')).toBeNull()
  })
})

describe('SocialMessage face token avatar', () => {
  let root: Root
  let container: HTMLDivElement

  beforeEach(() => {
    ;({ root, container } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('renders a face token image when faceTokenPath is present', () => {
    renderSocialMessage(root, {
      entry: entry({
        speaker: 'npc',
        text: 'Hey!',
        speakerName: 'Filo',
        faceTokenPath: 'C:/data/npc-face-tokens/camp/npc-filo.png'
      })
    })

    const image = container.querySelector('.social-avatar-image') as HTMLImageElement
    expect(image).toBeTruthy()
    expect(image.src).toContain('npc-filo.png')
    expect(container.querySelector('.social-avatar')?.textContent).toBe('')
  })

  it('falls back to the letter initial when the face token image fails to load', () => {
    renderSocialMessage(root, {
      entry: entry({
        speaker: 'npc',
        text: 'Hey!',
        speakerName: 'Filo',
        faceTokenPath: 'C:/missing/npc-filo.png'
      })
    })

    const image = container.querySelector('.social-avatar-image') as HTMLImageElement
    expect(image).toBeTruthy()
    act(() => {
      image.dispatchEvent(new Event('error'))
    })
    expect(container.querySelector('.social-avatar-image')).toBeNull()
    expect(container.querySelector('.social-avatar')?.textContent).toBe('F')
  })
})

describe('SocialMessage dossier interactions', () => {
  let root: Root
  let container: HTMLDivElement

  beforeEach(() => {
    ;({ root, container } = mountRoot())
  })

  afterEach(() => {
    unmountRoot(root, container)
  })

  it('opens dossier when an NPC with npcId avatar or name is clicked', () => {
    const onOpenNpcDossier = vi.fn()
    renderSocialMessage(root, {
      entry: entry({ speaker: 'npc', text: 'Hey!', speakerName: 'Filo', npcId: 'npc-filo' }),
      onOpenNpcDossier
    })

    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    act(() => {
      buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onOpenNpcDossier).toHaveBeenCalledWith('npc-filo')
    onOpenNpcDossier.mockClear()
    act(() => {
      buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onOpenNpcDossier).toHaveBeenCalledWith('npc-filo')
  })

  it('does not open dossier for player, party member, or NPC without npcId', () => {
    const onOpenNpcDossier = vi.fn()
    const cases = [
      entry({ speaker: 'player', text: 'Hello', playerLineKind: 'raw' }),
      entry({ speaker: 'partyMember', text: 'Ready.', speakerName: 'Brom' }),
      entry({ speaker: 'npc', text: 'Hi', speakerName: 'Stranger' })
    ]
    for (const logEntry of cases) {
      renderSocialMessage(root, { entry: logEntry, onOpenNpcDossier })
      expect(container.querySelectorAll('button')).toHaveLength(0)
      unmountRoot(root, container)
      ;({ root, container } = mountRoot())
    }
    expect(onOpenNpcDossier).not.toHaveBeenCalled()
  })
})
