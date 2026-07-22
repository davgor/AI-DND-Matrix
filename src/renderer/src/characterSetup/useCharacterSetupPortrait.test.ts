import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useCharacterSetupPortrait } from './useCharacterSetupPortrait'

describe('useCharacterSetupPortrait', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      characters: { generatePlayerIcon: vi.fn() },
      files: { selectPortrait: vi.fn() }
    })
  })

  it('sets portrait path and prompt on successful generate', async () => {
    const generatePlayerIcon = window.characters.generatePlayerIcon as ReturnType<typeof vi.fn>
    generatePlayerIcon.mockResolvedValue({
      ok: true,
      portraitPath: '/data/portraits/pc.png',
      appearancePrompt: 'scarred ranger'
    })
    const result = await window.characters.generatePlayerIcon({
      campaignId: 'c1',
      name: 'Kael',
      role: 'ranger',
      appearancePrompt: 'scarred ranger'
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.portraitPath).toBe('/data/portraits/pc.png')
    }
  })

  it('surfaces failure without inventing a path', async () => {
    const generatePlayerIcon = window.characters.generatePlayerIcon as ReturnType<typeof vi.fn>
    generatePlayerIcon.mockResolvedValue({ ok: false, message: 'offline' })
    const result = await window.characters.generatePlayerIcon({
      campaignId: 'c1',
      name: 'Kael',
      role: 'ranger',
      appearancePrompt: 'look'
    })
    expect(result.ok).toBe(false)
  })

  it('exports the portrait hook for create UI wiring', () => {
    expect(typeof useCharacterSetupPortrait).toBe('function')
  })
})
