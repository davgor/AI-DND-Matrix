/** @vitest-environment happy-dom */
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NpcDossierPortrait } from './NpcDossierPortrait'
import { NpcDossierModalBody } from './NpcDossierModalBody'
import { baseDossier } from './npcDossierTestUtils'

function mountPortrait(faceTokenPath: string | null): {
  container: HTMLDivElement
  root: Root
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<NpcDossierPortrait faceTokenPath={faceTokenPath} />)
  })
  return { container, root }
}

function unmount(root: Root, container: HTMLDivElement): void {
  act(() => {
    root.unmount()
  })
  container.remove()
}

describe('NpcDossierPortrait', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    if (root) {
      unmount(root, container)
    }
  })

  it('renders face token image when path is set', () => {
    const tokenPath = '/data/npc-face-tokens/camp/npc-1.png'
    ;({ container, root } = mountPortrait(tokenPath))
    const img = container.querySelector('.npc-dossier-portrait img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe(`file://${tokenPath}`)
    expect(container.querySelector('.npc-dossier-portrait-placeholder')).toBeNull()
  })

  it('renders neutral empty slot when path is null', () => {
    ;({ container, root } = mountPortrait(null))
    expect(container.querySelector('.npc-dossier-portrait img')).toBeNull()
    expect(container.querySelector('.npc-dossier-portrait-placeholder')).not.toBeNull()
  })

  it('falls back to empty slot when image load fails', () => {
    ;({ container, root } = mountPortrait('/data/npc-face-tokens/camp/missing.png'))
    const img = container.querySelector('.npc-dossier-portrait img')
    expect(img).not.toBeNull()
    act(() => {
      img?.dispatchEvent(new Event('error'))
    })
    expect(container.querySelector('.npc-dossier-portrait img')).toBeNull()
    expect(container.querySelector('.npc-dossier-portrait-placeholder')).not.toBeNull()
  })
})

describe('NpcDossierModalBody portrait layout', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('places portrait beside Traits and Facts using dossier faceTokenPath', () => {
    const tokenPath = '/data/npc-face-tokens/camp/npc-1.png'
    act(() => {
      root.render(
        <NpcDossierModalBody
          dossier={baseDossier({ faceTokenPath: tokenPath })}
          loading={false}
          error={null}
        />
      )
    })
    const topRow = container.querySelector('.npc-dossier-top-row')
    expect(topRow).not.toBeNull()
    const img = topRow?.querySelector('.npc-dossier-portrait img')
    expect(img?.getAttribute('src')).toBe(`file://${tokenPath}`)
    expect(topRow?.querySelector('h3')?.textContent).toBe('Traits')
  })
})
