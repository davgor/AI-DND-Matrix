import { describe, expect, it } from 'vitest'
import {
  SocialMessage,
  socialAvatarInitial,
  socialMessageSide,
  socialSpeakerName
} from './socialStreamParts'
import type { PlayLogEntry } from '../../../main/narrationLog'

function entry(partial: Partial<PlayLogEntry> & Pick<PlayLogEntry, 'speaker' | 'text'>): PlayLogEntry {
  return {
    id: partial.id ?? '1',
    timestamp: partial.timestamp ?? 't',
    speaker: partial.speaker,
    text: partial.text,
    reactionKind: partial.reactionKind,
    playerLineKind: partial.playerLineKind,
    speakerName: partial.speakerName
  }
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

describe('socialMessageSide', () => {
  it('places player messages on the outgoing side', () => {
    expect(socialMessageSide(entry({ speaker: 'player', text: 'Hi' }))).toBe('player')
    expect(socialMessageSide(entry({ speaker: 'npc', text: 'Hi', speakerName: 'Filo' }))).toBe('other')
  })
})

describe('SocialMessage', () => {
  it('renders an avatar bubble for NPC lines and not for player lines', () => {
    const npc = SocialMessage({
      entry: entry({ speaker: 'npc', text: 'Hey!', speakerName: 'Filo', reactionKind: 'dialogue' })
    })
    const player = SocialMessage({
      entry: entry({ speaker: 'player', text: 'Hello', playerLineKind: 'raw' })
    })

    const npcChildren = npc.props.children as JSX.Element[]
    expect(npcChildren[0]?.props.className).toBe('social-avatar')
    expect(npcChildren[0]?.props.children).toBe('F')
    expect(npc.props.className).toContain('social-message--other')

    const playerChildren = player.props.children as unknown[]
    expect(playerChildren[0]).toBeNull()
    expect(player.props.className).toContain('social-message--player')
  })
})
