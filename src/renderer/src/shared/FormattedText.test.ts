import { describe, expect, it, vi } from 'vitest'
import { FormattedText } from './FormattedText'
import { hasEmphasisTypes } from '../test/formattedTextTestUtils'
import { buttonEntries, collectText } from '../playView/askDmTestUtils'

describe('FormattedText emphasis', () => {
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

describe('FormattedText person links', () => {
  it('renders person buttons that call onPersonActivate with the matched npcId', () => {
    const onPersonActivate = vi.fn()
    const node = FormattedText({
      text: 'Met Anna at dawn.',
      personCandidates: [{ npcId: 'npc-anna', name: 'Anna' }],
      onPersonActivate
    })
    const person = buttonEntries(node).find((button) => button.label === 'Anna')
    expect(person).toBeDefined()
    person?.onClick?.()
    expect(onPersonActivate).toHaveBeenCalledWith('npc-anna')
  })

  it('keeps unmatched plain text without person buttons or false activate', () => {
    const onPersonActivate = vi.fn()
    const node = FormattedText({
      text: 'Rain drums on stone.',
      personCandidates: [{ npcId: 'npc-anna', name: 'Anna' }],
      onPersonActivate
    })
    expect(buttonEntries(node)).toEqual([])
    expect(collectText(node)).toBe('Rain drums on stone.')
    expect(onPersonActivate).not.toHaveBeenCalled()
  })

  it('composes emphasis with person links without marker leakage', () => {
    const onPersonActivate = vi.fn()
    const node = FormattedText({
      text: '*Anna*',
      personCandidates: [{ npcId: 'npc-anna', name: 'Anna' }],
      onPersonActivate
    })
    expect(hasEmphasisTypes(node, ['em'])).toBe(true)
    const person = buttonEntries(node).find((button) => button.label === 'Anna')
    expect(person).toBeDefined()
    expect(collectText(node)).toBe('Anna')
    expect(collectText(node)).not.toContain('*')
    person?.onClick?.()
    expect(onPersonActivate).toHaveBeenCalledWith('npc-anna')
  })
})
