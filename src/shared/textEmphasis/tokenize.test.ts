import { describe, expect, it } from 'vitest'
import { tokenizeTextEmphasis } from './tokenize'

describe('tokenizeTextEmphasis', () => {
  it('returns plain text unchanged when there are no markers', () => {
    expect(tokenizeTextEmphasis('Rain drums on stone.')).toEqual([
      { type: 'text', content: 'Rain drums on stone.' }
    ])
  })

  it('tokenizes single italic and bold spans with alternate markers', () => {
    expect(tokenizeTextEmphasis('*soft* and _also soft_')).toEqual([
      { type: 'em', content: 'soft' },
      { type: 'text', content: ' and ' },
      { type: 'em', content: 'also soft' }
    ])
    expect(tokenizeTextEmphasis('**loud** and __also loud__')).toEqual([
      { type: 'strong', content: 'loud' },
      { type: 'text', content: ' and ' },
      { type: 'strong', content: 'also loud' }
    ])
  })

  it('tokenizes multiple emphasis spans in one string', () => {
    expect(tokenizeTextEmphasis('*a* then **b** then _c_')).toEqual([
      { type: 'em', content: 'a' },
      { type: 'text', content: ' then ' },
      { type: 'strong', content: 'b' },
      { type: 'text', content: ' then ' },
      { type: 'em', content: 'c' }
    ])
  })

  it('treats escaped markers as literal characters', () => {
    expect(tokenizeTextEmphasis('\\*not emphasis\\*')).toEqual([
      { type: 'text', content: '*not emphasis*' }
    ])
  })

  it('leaves unmatched markers as literal text', () => {
    expect(tokenizeTextEmphasis('*no closing partner')).toEqual([
      { type: 'text', content: '*no closing partner' }
    ])
  })

  it('renders only the outer span when emphasis is nested (v1)', () => {
    expect(tokenizeTextEmphasis('**bold with *italic* inside**')).toEqual([
      { type: 'strong', content: 'bold with *italic* inside' }
    ])
  })
})
