import { describe, expect, it } from 'vitest'
import type { PlayLogEntry } from '../../../main/narrationLog'
import { appendOptimisticPlayerMessage, mergeOptimisticIntoLog } from './optimisticSocialMessage'

describe('appendOptimisticPlayerMessage', () => {
  it('builds a raw player social entry from typed input', () => {
    const entry = appendOptimisticPlayerMessage('I wave at Filo')
    expect(entry).toEqual(
      expect.objectContaining({
        speaker: 'player',
        text: 'I wave at Filo',
        playerLineKind: 'raw'
      })
    )
    expect(entry.id).toMatch(/^optimistic-/)
  })

  it('returns null for blank input', () => {
    expect(appendOptimisticPlayerMessage('   ')).toBeNull()
  })
})

describe('mergeOptimisticIntoLog', () => {
  it('appends optimistic entry when the persisted log does not yet include the text', () => {
    const base: PlayLogEntry[] = [
      { id: '1', timestamp: 't1', speaker: 'npc', text: 'Hello.', speakerName: 'Filo' }
    ]
    const optimistic = appendOptimisticPlayerMessage('Hi Filo')
    expect(optimistic).not.toBeNull()
    expect(mergeOptimisticIntoLog(base, optimistic).map((e) => e.text)).toEqual(['Hello.', 'Hi Filo'])
  })

  it('drops optimistic entry once the persisted log contains the same raw player text', () => {
    const optimistic = appendOptimisticPlayerMessage('Hi Filo')
    const persisted: PlayLogEntry[] = [
      {
        id: '1',
        timestamp: 't1',
        speaker: 'player',
        text: 'Hi Filo',
        playerLineKind: 'raw'
      }
    ]
    expect(mergeOptimisticIntoLog(persisted, optimistic)).toEqual(persisted)
  })
})
