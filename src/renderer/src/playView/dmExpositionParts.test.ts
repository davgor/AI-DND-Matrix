import { describe, expect, it } from 'vitest'
import { AlignmentShiftWarningBanner, renderFeedLine, renderNpcLine } from './dmExpositionParts'
import { hasEmphasisTypes } from '../shared/formattedTextTestUtils'

describe('AlignmentShiftWarningBanner', () => {
  it('renders alert role and warning copy when a shift is pending', () => {
    const banner = AlignmentShiftWarningBanner({
      pending: {
        proposedAlignment: 'neutral_evil',
        warningText: 'Looting the shrine may change who you are.',
        flaggedAt: '2026-01-01T00:00:00.000Z'
      },
      playerAlignment: 'lawful_good'
    })

    expect(banner.props.role).toBe('alert')
    expect(banner.props.className).toBe('dm-alignment-shift-warning')
    const children = banner.props.children as JSX.Element[]
    expect(String(children[1].props.children)).toContain('Looting the shrine')
    expect(String(children[2].props.children)).toContain('Lawful Good')
    expect(String(children[2].props.children)).toContain('Neutral Evil')
  })
})

describe('renderFeedLine', () => {
  it('renders player action expression in bold and hides raw player lines from dm feed path', () => {
    const action = renderFeedLine({
      speaker: 'player',
      playerLineKind: 'actionExpression',
      text: 'Kael draws his sword.'
    })
    expect(action.type).toBe('strong')
    expect(action.props.children).toBe('Kael draws his sword.')
  })

  it('renders italic npc dialogue and bold creature actions with speaker labels', () => {
    const dialogue = renderFeedLine({
      speaker: 'npc',
      reactionKind: 'dialogue',
      text: 'Hello.',
      id: '1',
      timestamp: 't'
    })
    const creature = renderFeedLine({
      speaker: 'npc',
      reactionKind: 'action',
      text: 'The wolf lunges.',
      id: '2',
      timestamp: 't'
    })

    const dialogueBody = (dialogue.props.children as unknown[])[2] as JSX.Element
    const creatureBody = (creature.props.children as unknown[])[2] as JSX.Element
    expect(dialogueBody.type).toBe('em')
    expect(creatureBody.type).toBe('strong')
  })
})

describe('renderNpcLine', () => {
  it('renders dialogue in italics and actions in bold', () => {
    const dialogue = renderNpcLine({ reactionKind: 'dialogue', text: 'Hello.' })
    const action = renderNpcLine({ reactionKind: 'action', text: 'The wolf lunges.' })

    expect(dialogue.type).toBe('em')
    expect(dialogue.props.children.type).toBeDefined()
    expect(action.type).toBe('strong')
    expect(action.props.children.type).toBeDefined()
  })

  it('renders inline emphasis inside dialogue and action lines', () => {
    const dialogue = renderNpcLine({ reactionKind: 'dialogue', text: 'I *never* lie.' })
    const action = renderNpcLine({ reactionKind: 'action', text: 'The wolf **snarls**.' })

    const dialogueInner = dialogue.props.children as JSX.Element
    const actionInner = action.props.children as JSX.Element
    expect(hasEmphasisTypes(dialogueInner, ['em'])).toBe(true)
    expect(hasEmphasisTypes(actionInner, ['strong'])).toBe(true)
    expect(dialogue.type).toBe('em')
    expect(action.type).toBe('strong')
  })
})
