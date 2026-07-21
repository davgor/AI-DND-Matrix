/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import type { PlayLogEntry } from '../../../../main/narrationLog'
import {
  eligibleHighlightIds,
  entryIds,
  isNpcDialogueEntry,
  isSceneSettingEntry
} from './incomingHighlightTargets'
import { SocialMessage } from '../socialStreamParts'
import { INCOMING_HIGHLIGHT_CLASS } from './index'

function dmEntry(
  partial: Partial<PlayLogEntry> & Pick<PlayLogEntry, 'id' | 'text'>
): PlayLogEntry {
  return {
    timestamp: partial.timestamp ?? 't',
    speaker: 'dm',
    sceneSetting: partial.sceneSetting,
    ...partial
  }
}

function socialEntry(
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

describe('incomingHighlightTargets', () => {
  it('selects scene-setting and npc-dialogue ids only', () => {
    const entries: PlayLogEntry[] = [
      dmEntry({ id: '1', text: 'Narration', sceneSetting: false }),
      dmEntry({ id: '2', text: 'Setting', sceneSetting: true }),
      socialEntry({ id: '3', speaker: 'npc', text: 'Hi', reactionKind: 'dialogue' }),
      socialEntry({ id: '4', speaker: 'npc', text: 'Lunges', reactionKind: 'action' }),
      socialEntry({ id: '5', speaker: 'player', text: 'Hello', playerLineKind: 'raw' })
    ]
    expect(eligibleHighlightIds(entries, isSceneSettingEntry)).toEqual(['2'])
    expect(eligibleHighlightIds(entries, isNpcDialogueEntry)).toEqual(['3'])
    expect(entryIds(entries)).toEqual(['1', '2', '3', '4', '5'])
  })
})

describe('SocialMessage highlight prop', () => {
  it('adds the shared class to the bubble when highlighted', () => {
    const plain = SocialMessage({
      entry: socialEntry({ id: '1', speaker: 'npc', text: 'Hi', reactionKind: 'dialogue' })
    })
    const lit = SocialMessage({
      entry: socialEntry({ id: '1', speaker: 'npc', text: 'Hi', reactionKind: 'dialogue' }),
      highlighted: true
    })
    const plainBubble = (plain.props.children as JSX.Element[])[1].props.children[1]
    const litBubble = (lit.props.children as JSX.Element[])[1].props.children[1]
    expect(plainBubble.props.className).toBe('social-message-bubble')
    expect(litBubble.props.className).toContain(INCOMING_HIGHLIGHT_CLASS)
  })
})
