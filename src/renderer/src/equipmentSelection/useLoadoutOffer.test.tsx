/** @vitest-environment happy-dom */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, useEffect } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StartingLoadoutOffer } from '../../../shared/startingLoadout/types'
import { STARTING_OFF_HAND_EMPTY } from '../../../engine/startingLoadout/packages'
import { mountRoot, unmountRoot } from '../playView/d20Overlay/d20OverlayTestUtils'
import { useLoadoutOffer } from './useLoadoutOffer'

const fighterOffer: StartingLoadoutOffer = {
  archetype: 'fighter',
  weapons: [
    { name: 'Longsword', description: 'sword', handedness: 'oneHand' },
    { name: 'Greataxe', description: 'axe', handedness: 'twoHand' }
  ],
  armors: [{ name: 'Chain Hauberk', description: 'mail' }],
  offHand: [
    { id: 'Wooden Shield', label: 'Wooden Shield' },
    { id: STARTING_OFF_HAND_EMPTY, label: 'Empty' }
  ],
  spells: [
    {
      key: 'rallying-strike',
      name: 'Rallying Strike',
      effectType: 'damage',
      range: 'melee',
      cost: 1,
      tags: ['morale']
    }
  ],
  spellPickCount: 1
}

function LoadoutProbe(props: {
  characterId: string
  onSnapshot: (snapshot: { loading: boolean; offerArchetype: string | null }) => void
}): JSX.Element {
  const loaded = useLoadoutOffer(props.characterId)
  useEffect(() => {
    props.onSnapshot({
      loading: loaded.loading,
      offerArchetype: loaded.offer?.archetype ?? null
    })
  }, [loaded.loading, loaded.offer, props.onSnapshot])
  return (
    <div
      data-loading={String(loaded.loading)}
      data-archetype={loaded.offer?.archetype ?? ''}
    />
  )
}

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useLoadoutOffer', () => {
  let container: HTMLDivElement
  let root: Root
  let getOffer: ReturnType<typeof vi.fn>
  let snapshots: Array<{ loading: boolean; offerArchetype: string | null }>

  beforeEach(() => {
    ;({ container, root } = mountRoot())
    snapshots = []
    getOffer = vi.fn(async () => ({ ok: true as const, offer: fighterOffer }))
    ;(window as unknown as { startingLoadout: { getOffer: typeof getOffer } }).startingLoadout = {
      getOffer
    }
  })

  afterEach(() => {
    unmountRoot(root, container)
    vi.restoreAllMocks()
  })

  it('loads the offer once and leaves the loading state', async () => {
    act(() => {
      root.render(
        <LoadoutProbe
          characterId="char-1"
          onSnapshot={(snapshot) => {
            snapshots.push(snapshot)
          }}
        />
      )
    })

    await flushMicrotasks()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(getOffer).toHaveBeenCalledTimes(1)
    expect(getOffer).toHaveBeenCalledWith({ characterId: 'char-1' })
    expect(container.querySelector('[data-loading]')?.getAttribute('data-loading')).toBe('false')
    expect(container.querySelector('[data-archetype]')?.getAttribute('data-archetype')).toBe(
      'fighter'
    )
    expect(snapshots.some((s) => s.loading === false && s.offerArchetype === 'fighter')).toBe(true)
  })

  it('fetches only when characterId changes', () => {
    const source = readFileSync(join(__dirname, 'useLoadoutOffer.ts'), 'utf8')
    expect(source).toMatch(/\}, \[characterId\]\)/)
    expect(source).not.toMatch(/\[characterId, setters\]/)
  })
})
