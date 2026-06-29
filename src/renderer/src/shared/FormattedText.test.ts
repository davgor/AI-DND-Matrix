import { describe, expect, it } from 'vitest'
import { FormattedText } from './FormattedText'
import { hasEmphasisTypes } from './formattedTextTestUtils'

describe('FormattedText', () => {
  it('renders plain text unchanged when there are no emphasis markers', () => {
    const node = FormattedText({ text: 'Rain drums on stone.' })
    expect(node.type).toBe('span')
    expect(node.props.children).toEqual(['Rain drums on stone.'])
  })

  it('renders single-span italic and bold emphasis', () => {
    const italic = FormattedText({ text: '*whispered*' })
    const bold = FormattedText({ text: '**shouted**' })

    expect(italic.props.children[0].type).toBe('em')
    expect(italic.props.children[0].props.children).toBe('whispered')
    expect(bold.props.children[0].type).toBe('strong')
    expect(bold.props.children[0].props.children).toBe('shouted')
  })

  it('renders multiple spans and supports a wrapping element', () => {
    const node = FormattedText({
      text: '*a* and **b**',
      as: 'p',
      className: 'scene-text'
    })

    expect(node.type).toBe('p')
    expect(node.props.className).toBe('scene-text')
    expect(hasEmphasisTypes(node, ['em', 'strong'])).toBe(true)
  })
})
