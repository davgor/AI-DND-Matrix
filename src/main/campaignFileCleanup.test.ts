import { describe, expect, it, vi } from 'vitest'
import type { Character } from '../db/repositories/characters'
import { collectCharacterUploadPaths, deleteUploadFiles } from './campaignFileCleanup'

const CHARACTER: Character = {
  id: 'c1',
  campaignId: 'camp-1',
  name: 'Hero',
  characterClass: 'fighter',
  stats: {},
  inventory: [],
  hp: 10,
  xp: 0,
  level: 1,
  currency: 0,
  kind: 'player',
  sourceNpcId: null,
  portraitPath: '/data/portraits/a.png',
  sheetBackgroundPath: '/data/sheet-backgrounds/b.png',
  identityWho: null,
  identityWhy: null,
  identityWhere: null,
  identityWhat: null,
  openingScene: null,
  guidedCreationPhase: 'complete',
  alignment: null,
  pendingAlignmentShift: null,
  lifeStatus: 'alive',
  diedAt: null,
  deathCause: null,
  obituary: null,
  ownerPlayerCharacterId: null,
  raceKey: null,
  backgroundKey: null,
  backgroundStory: null,
  backgroundCustomLabel: null,
  // EPIC-133
  lastActiveInGameDate: 0
}

describe('campaign file cleanup', () => {
  it('collects portrait and sheet paths from owned characters', () => {
    expect(collectCharacterUploadPaths([CHARACTER])).toEqual([
      '/data/portraits/a.png',
      '/data/sheet-backgrounds/b.png'
    ])
  })

  it('attempts to delete each owned file path', () => {
    const unlink = vi.fn()
    deleteUploadFiles(collectCharacterUploadPaths([CHARACTER]), unlink)
    expect(unlink).toHaveBeenCalledTimes(2)
  })

  it('tolerates missing files without aborting cleanup', () => {
    const unlink = vi.fn((path: string) => {
      if (path.endsWith('a.png')) {
        throw new Error('ENOENT')
      }
    })
    expect(() => deleteUploadFiles(collectCharacterUploadPaths([CHARACTER]), unlink)).not.toThrow()
    expect(unlink).toHaveBeenCalledTimes(2)
  })

  it('only collects upload paths from the provided character list', () => {
    const other: Character = {
      ...CHARACTER,
      id: 'c2',
      campaignId: 'camp-2',
      portraitPath: '/data/portraits/other.png',
      sheetBackgroundPath: null
    }
    expect(collectCharacterUploadPaths([CHARACTER])).not.toContain('/data/portraits/other.png')
    expect(collectCharacterUploadPaths([other])).toEqual(['/data/portraits/other.png'])
  })
})
