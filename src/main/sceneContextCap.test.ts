import { describe, expect, it } from 'vitest'
import {
  SCENE_CONTEXT_MAX_BEATS,
  SCENE_CONTEXT_MAX_CHARS,
  capSceneContextForPrompt
} from './sceneContextCap'

describe('capSceneContextForPrompt (040.5)', () => {
  it('returns an empty string when no beats have produced scene text', () => {
    expect(capSceneContextForPrompt([])).toBe('')
  })

  it('joins beats with a space when within both limits', () => {
    expect(capSceneContextForPrompt(['Kael draws his sword.', 'The bandit flinches.'])).toBe(
      'Kael draws his sword. The bandit flinches.'
    )
  })

  it('keeps only the most recent beats when the beat count exceeds the window', () => {
    const beats = ['first beat', 'second beat', 'third beat']
    const capped = capSceneContextForPrompt(beats)
    expect(capped).toBe('second beat third beat')
    expect(beats).toHaveLength(3)
  })

  it('caps to the trailing characters, ending with the most recent beat text', () => {
    const tail = 'The braziers gutter as the drake circles overhead.'
    const longBeat = `${'A'.repeat(SCENE_CONTEXT_MAX_CHARS + 100)} ${tail}`
    const capped = capSceneContextForPrompt(['Kael raises his shield.', longBeat])
    expect(capped).toHaveLength(SCENE_CONTEXT_MAX_CHARS)
    expect(capped.endsWith(tail)).toBe(true)
    expect(capped).not.toContain('Kael raises his shield.')
  })

  it('exports the documented config constants', () => {
    expect(SCENE_CONTEXT_MAX_BEATS).toBe(2)
    expect(SCENE_CONTEXT_MAX_CHARS).toBe(1500)
  })
})
