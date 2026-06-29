import { describe, expect, it } from 'vitest'
import { mapCreateStageToPlayerMessage } from './stageMessages'

describe('mapCreateStageToPlayerMessage', () => {
  it('maps technical stages to player-friendly labels', () => {
    expect(mapCreateStageToPlayerMessage('request')).toBe('Consulting the narrative engine')
    expect(mapCreateStageToPlayerMessage('persist')).toBe('Saving your campaign')
  })
})
