import { describe, expect, it } from 'vitest'
import { mapCreateStageToPlayerMessage } from './stageMessages'

describe('mapCreateStageToPlayerMessage', () => {
  it('maps technical stages to player-friendly labels', () => {
    expect(mapCreateStageToPlayerMessage('world')).toBe('Imagining your world')
    expect(mapCreateStageToPlayerMessage('regions')).toBe('Shaping regions')
    expect(mapCreateStageToPlayerMessage('npcs')).toBe('Populating your world')
    expect(mapCreateStageToPlayerMessage('story')).toBe('Weaving the main story')
    expect(mapCreateStageToPlayerMessage('persist')).toBe('Saving your campaign')
    expect(mapCreateStageToPlayerMessage(null)).toBe('Creating your campaign')
  })
})
