import { describe, expect, it, vi } from 'vitest'
import type { CampaignDetail } from '../../../main/campaignIpc'
import { createReadyToEnterPlayHandler } from './readyToEnterPlayHandler'

function playableDetail(): CampaignDetail {
  return {
    campaign: {
      id: 'campaign-1',
      name: 'Test',
      premisePrompt: 'A test',
      deathMode: 'legendary',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastPlayedAt: '2026-01-01T00:00:00.000Z',
      inGameDate: 0
    } as CampaignDetail['campaign'],
    regions: [{ id: 'r1', name: 'Oakhollow' } as CampaignDetail['regions'][number]],
    npcs: [{ id: 'n1', regionId: 'r1' } as CampaignDetail['npcs'][number]],
    regionExtras: [],
    storyThreads: [],
    characters: []
  }
}

function stubReadyToEnterPlay(
  readyToEnterPlay: ReturnType<typeof vi.fn>
): void {
  vi.stubGlobal('window', { guidedCreation: { readyToEnterPlay } })
}

describe('createReadyToEnterPlayHandler success', () => {
  it('refreshes detail then enters play after a successful readyToEnterPlay IPC', async () => {
    const refreshDetail = vi.fn(async () => {})
    const onEnterPlay = vi.fn()
    const setEnterPlayBlockerMessage = vi.fn()
    const readyToEnterPlay = vi.fn(async () => ({ ok: true as const }))
    stubReadyToEnterPlay(readyToEnterPlay)

    await createReadyToEnterPlayHandler({
      detail: playableDetail(),
      campaignId: 'campaign-1',
      characterId: 'char-1',
      refreshDetail,
      setEnterPlayBlockerMessage,
      onEnterPlay
    })()

    expect(readyToEnterPlay).toHaveBeenCalledWith({
      campaignId: 'campaign-1',
      characterId: 'char-1'
    })
    expect(refreshDetail).toHaveBeenCalledOnce()
    expect(onEnterPlay).toHaveBeenCalledWith('char-1')
    expect(setEnterPlayBlockerMessage).toHaveBeenCalledWith(null)
  })
})

describe('createReadyToEnterPlayHandler failures', () => {
  it('surfaces a blocker when refreshDetail is missing or throws', async () => {
    const setEnterPlayBlockerMessage = vi.fn()
    const onEnterPlay = vi.fn()
    stubReadyToEnterPlay(vi.fn(async () => ({ ok: true as const })))

    await createReadyToEnterPlayHandler({
      detail: playableDetail(),
      campaignId: 'campaign-1',
      characterId: 'char-1',
      refreshDetail: undefined as unknown as () => Promise<void>,
      setEnterPlayBlockerMessage,
      onEnterPlay
    })()

    expect(onEnterPlay).not.toHaveBeenCalled()
    expect(setEnterPlayBlockerMessage).toHaveBeenCalledWith('Could not enter play. Try again.')
  })

  it('surfaces campaign play blockers without calling IPC', async () => {
    const setEnterPlayBlockerMessage = vi.fn()
    const readyToEnterPlay = vi.fn()
    stubReadyToEnterPlay(readyToEnterPlay)
    const detail = playableDetail()
    detail.npcs = []

    await createReadyToEnterPlayHandler({
      detail,
      campaignId: 'campaign-1',
      characterId: 'char-1',
      refreshDetail: vi.fn(async () => {}),
      setEnterPlayBlockerMessage,
      onEnterPlay: vi.fn()
    })()

    expect(readyToEnterPlay).not.toHaveBeenCalled()
    expect(setEnterPlayBlockerMessage).toHaveBeenCalledWith(expect.stringMatching(/Oakhollow/))
  })
})
