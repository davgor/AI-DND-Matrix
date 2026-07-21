/** @vitest-environment happy-dom */
import { act, useEffect } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayAwareHubSnapshot } from '../../../shared/campaignHub/types'
import { useHubSnapshot } from './useHubSnapshot'
import { mountRoot, unmountRoot } from '../playView/d20Overlay/d20OverlayTestUtils'

function hubFor(campaignId: string): PlayAwareHubSnapshot {
  return {
    campaign: {
      id: campaignId,
      name: campaignId,
      premisePrompt: '',
      createdAt: 't',
      worldSummary: null,
      worldHistory: null,
      pantheonSummary: null
    } as unknown as PlayAwareHubSnapshot['campaign'],
    regions: [],
    npcs: [],
    regionExtras: [],
    storyThreads: [],
    characters: [],
    deities: [],
    currentStateSummary: '',
    cast: [],
    questSummariesByCharacterId: [],
    regionQuestAvailability: []
  } as unknown as PlayAwareHubSnapshot
}

function HubProbe(props: {
  stage: 'campaignHub' | 'main'
  campaignId: string
  onSnapshot: (id: string | null | undefined) => void
}): JSX.Element {
  const { hubSnapshot } = useHubSnapshot(props.stage, props.campaignId, 'created')
  useEffect(() => {
    props.onSnapshot(hubSnapshot?.campaign?.id)
  }, [hubSnapshot, props])
  return <div data-hub={hubSnapshot?.campaign?.id ?? 'null'} />
}

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

function renderHub(root: Root, campaignId: string): void {
  act(() => {
    root.render(
      <HubProbe stage="campaignHub" campaignId={campaignId} onSnapshot={() => {}} />
    )
  })
}

describe('useHubSnapshot campaign switch', () => {
  let container: HTMLDivElement
  let root: Root
  let getHubSnapshot: ReturnType<typeof vi.fn>

  beforeEach(() => {
    ;({ container, root } = mountRoot())
    getHubSnapshot = vi.fn(async (campaignId: string) => hubFor(campaignId))
    ;(window as unknown as { campaigns: { getHubSnapshot: typeof getHubSnapshot } }).campaigns = {
      getHubSnapshot
    }
  })

  afterEach(() => {
    unmountRoot(root, container)
    vi.restoreAllMocks()
  })

  it('refetches when campaignId changes even if a prior hubSnapshot is truthy', async () => {
    renderHub(root, 'camp-a')
    await flushMicrotasks()
    expect(getHubSnapshot).toHaveBeenCalledWith('camp-a')
    expect(container.querySelector('[data-hub]')?.getAttribute('data-hub')).toBe('camp-a')

    renderHub(root, 'camp-b')
    await flushMicrotasks()
    expect(getHubSnapshot).toHaveBeenCalledWith('camp-b')
    expect(container.querySelector('[data-hub]')?.getAttribute('data-hub')).toBe('camp-b')
  })
})

describe('useHubSnapshot early-return regression (source)', () => {
  it('does not early-return solely because hubSnapshot is truthy', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const source = readFileSync(join(__dirname, 'useHubSnapshot.ts'), 'utf8')
    expect(source).not.toMatch(/hubSnapshot\)\s*\{/)
    expect(source).not.toMatch(/\|\|\s*hubSnapshot\b/)
  })
})
