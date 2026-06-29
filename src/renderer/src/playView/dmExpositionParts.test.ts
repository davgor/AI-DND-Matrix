import { describe, expect, it } from 'vitest'
import { AlignmentShiftWarningBanner, renderNpcLine } from './dmExpositionParts'

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

describe('renderNpcLine', () => {
  it('renders dialogue in italics and actions in bold', () => {
    const dialogue = renderNpcLine({ reactionKind: 'dialogue', text: 'Hello.' })
    const action = renderNpcLine({ reactionKind: 'action', text: 'The wolf lunges.' })

    expect(dialogue.type).toBe('em')
    expect(action.type).toBe('strong')
  })
})
