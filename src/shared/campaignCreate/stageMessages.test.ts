import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildCreateProgress,
  CREATE_STAGE_GOOFY_MESSAGES,
  mapCreateStageToPlayerMessage,
  mapCreateStageTraceLabel,
  pickCreateStageGoofyMessage
} from './stageMessages'
import { CREATE_CAMPAIGN_STAGE_TOTAL } from './types'

describe('pickCreateStageGoofyMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('picks a goofy line from the stage pool', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(pickCreateStageGoofyMessage('world')).toBe(CREATE_STAGE_GOOFY_MESSAGES.world[0])
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const last = CREATE_STAGE_GOOFY_MESSAGES.npcs[CREATE_STAGE_GOOFY_MESSAGES.npcs.length - 1]
    expect(pickCreateStageGoofyMessage('npcs')).toBe(last)
  })
})

describe('buildCreateProgress', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds progress with stage metadata and a goofy status line', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const progress = buildCreateProgress('story')
    expect(progress).toEqual({
      stage: 'story',
      stageIndex: 7,
      stageTotal: CREATE_CAMPAIGN_STAGE_TOTAL,
      statusText: CREATE_STAGE_GOOFY_MESSAGES.story[0]
    })
  })
})

describe('mapCreateStageToPlayerMessage', () => {
  it('maps technical stages to player-friendly labels', () => {
    expect(mapCreateStageToPlayerMessage('canon')).toBe('Recalling known places and people')
    expect(mapCreateStageToPlayerMessage('pantheon')).toBe('Assembling the pantheon')
    expect(mapCreateStageToPlayerMessage('world')).toBe('Imagining your world')
    expect(mapCreateStageToPlayerMessage('factions')).toBe('Sketching power blocs')
    expect(mapCreateStageToPlayerMessage('regions')).toBe('Shaping regions')
    expect(mapCreateStageToPlayerMessage('npcs')).toBe('Populating your world')
    expect(mapCreateStageToPlayerMessage('bestiary')).toBe('Stocking the bestiary')
    expect(mapCreateStageToPlayerMessage('story')).toBe('Weaving the main story')
    expect(mapCreateStageToPlayerMessage('persist')).toBe('Saving your campaign')
    expect(mapCreateStageToPlayerMessage(null)).toBe('Creating your campaign')
  })
})

describe('mapCreateStageTraceLabel', () => {
  it('maps stages to short trace labels', () => {
    expect(mapCreateStageTraceLabel('canon')).toBe('Canon')
    expect(mapCreateStageTraceLabel('pantheon')).toBe('Pantheon')
    expect(mapCreateStageTraceLabel('world')).toBe('World')
    expect(mapCreateStageTraceLabel('factions')).toBe('Factions')
    expect(mapCreateStageTraceLabel('regions')).toBe('Regions')
    expect(mapCreateStageTraceLabel('npcs')).toBe('NPCs')
    expect(mapCreateStageTraceLabel('bestiary')).toBe('Bestiary')
    expect(mapCreateStageTraceLabel('story')).toBe('Story')
    expect(mapCreateStageTraceLabel('persist')).toBe('Saving')
  })
})
