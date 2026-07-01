import { describe, expect, it } from 'vitest'
import { spellCheckerLanguages } from './spellcheck'

describe('spellCheckerLanguages', () => {
  it('prefers the app locale, its language base, and en-US', () => {
    expect(spellCheckerLanguages('en-GB')).toEqual(['en-GB', 'en', 'en-US'])
  })

  it('deduplicates when locale is already en-US', () => {
    expect(spellCheckerLanguages('en-US')).toEqual(['en-US', 'en'])
  })
})
