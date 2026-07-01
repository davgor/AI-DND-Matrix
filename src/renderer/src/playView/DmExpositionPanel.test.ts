import { describe, expect, it } from 'vitest'
import { pickCurrentSceneText } from '../../../shared/inCampaignLayout/sceneContext'
import { FormattedText } from '../shared/FormattedText'
import { hasEmphasisTypes } from '../shared/formattedTextTestUtils'

describe('DmExpositionPanel scene states', () => {
  it('shows empty scene copy when exposition feed has no DM lines', () => {
    expect(pickCurrentSceneText([])).toBeNull()
  })

  it('emphasizes the latest DM line as active scene context', () => {
    const scene = pickCurrentSceneText([
      { id: '1', timestamp: 't', speaker: 'dm', text: 'Rain drums on stone.' },
      { id: '2', timestamp: 't2', speaker: 'npc', text: 'Halt!' }
    ])
    expect(scene).toBe('Rain drums on stone.')
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
})
