import { describe, expect, it } from 'vitest'
import { pickSceneSummary } from '../../../shared/inCampaignLayout/sceneContext'
import { FormattedText } from '../shared/FormattedText'
import { hasEmphasisTypes } from '../shared/formattedTextTestUtils'
import { renderFeedLine } from './dmExpositionParts'

describe('DmExpositionPanel scene states', () => {
  it('shows quiet scene copy when exposition feed has no scene-setting lines', () => {
    expect(pickSceneSummary([])).toBe('The scene is quiet…')
  })

  it('prefers scene-setting DM lines over latest narration', () => {
    const scene = pickSceneSummary([
      { id: '1', timestamp: 't', speaker: 'dm', text: 'Rain drums on stone.' },
      { id: '2', timestamp: 't2', speaker: 'npc', text: 'Halt!' },
      { id: '3', timestamp: 't3', speaker: 'dm', text: 'Torches gutter in the wind.', sceneSetting: true }
    ])
    expect(scene).toBe('Torches gutter in the wind.')
  })

  it('renders emphasis markers in scene narration text', () => {
    const node = FormattedText({
      as: 'p',
      className: 'dm-exposition-scene-text',
      text: 'The *wind* howls and **thunder** rolls.'
    })

    expect(node.type).toBe('p')
    expect(node.props.className).toBe('dm-exposition-scene-text')
    expect(hasEmphasisTypes(node, ['em', 'strong'])).toBe(true)
  })

  it('prefixes npc feed lines with speaker labels', () => {
    const line = renderFeedLine({
      speaker: 'npc',
      reactionKind: 'dialogue',
      text: 'Hello.',
      speakerName: 'Mira',
      id: '1',
      timestamp: 't'
    })
    expect(line.type).toBeDefined()
    const children = line.props.children as unknown[]
    expect(children[0].props.className).toBe('dm-feed-speaker')
    expect(children[0].props.children).toEqual(['Mira', ':'])
    const dialogueBody = children[2] as JSX.Element
    expect(dialogueBody.type).toBe('em')
  })
})
