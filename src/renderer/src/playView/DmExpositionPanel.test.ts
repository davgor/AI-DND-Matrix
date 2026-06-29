import { describe, expect, it } from 'vitest'
import { pickCurrentSceneText } from '../../../shared/inCampaignLayout/sceneContext'

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
})
