import { describe, expect, it } from 'vitest'
import {
  isCommitAlignmentShift,
  isPendingAlignmentShift,
  parseAlignment,
  stripActionMarkers,
  wrapActionDescription
} from './types'

describe('alignment types', () => {
  it('parses alignment slugs and labels', () => {
    expect(parseAlignment('lawful_good')).toBe('lawful_good')
    expect(parseAlignment('Lawful Good')).toBe('lawful_good')
    expect(parseAlignment('not-an-alignment')).toBeUndefined()
  })

  it('validates pending alignment shift shape', () => {
    expect(
      isPendingAlignmentShift({
        proposedAlignment: 'chaotic_evil',
        warningText: 'Betraying the miller crosses a line.',
        flaggedAt: '2026-01-01T00:00:00.000Z'
      })
    ).toBe(true)
    expect(isPendingAlignmentShift({ proposedAlignment: 'chaotic_evil' })).toBe(false)
  })

  it('validates commit alignment shift shape', () => {
    expect(isCommitAlignmentShift({ newAlignment: 'neutral_evil' })).toBe(true)
    expect(isCommitAlignmentShift({ newAlignment: 'bogus' })).toBe(false)
  })

  it('wraps and strips action description markers', () => {
    expect(wrapActionDescription('The wolf lunges.')).toBe('**The wolf lunges.**')
    expect(wrapActionDescription('**Already wrapped.**')).toBe('**Already wrapped.**')
    expect(stripActionMarkers('**The wolf lunges.**')).toBe('The wolf lunges.')
  })
})
