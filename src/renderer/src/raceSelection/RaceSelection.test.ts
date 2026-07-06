import { describe, expect, it } from 'vitest'
import { CUSTOM_RACE_KEY } from '../../../engine/raceSelection/roster'
import type { RaceLore } from '../../../shared/raceSelection/types'
import {
  applyLorePreview,
  canConfirmRaceSelection,
  canGenerateLore,
  hydrateRaceSelectionState,
  initialRaceSelectionState,
  isEstablishedPresetRace,
  isLoreEditable,
  resolveInitialRaceSelectionState,
  selectCustomRace,
  selectPresetRace,
  showRegenerateControl,
  updateCustomSeed,
  updateLoreField
} from './raceSelectionLogic'

const sampleLore: RaceLore = {
  summary: 'Elves here are reclusive tree-wardens.',
  appearance: 'Tall, silver-eyed, bark-scarred skin.',
  culture: 'They sing to the canopy and shun iron.',
  roleInThisLand: 'Guardians of the mistwood border.',
  hooks: ['A sapling oracle speaks only to outsiders.']
}

describe('raceSelectionLogic', () => {
  it('tracks established preset races from the campaign catalog', () => {
    expect(
      isEstablishedPresetRace(
        [{ id: '1', campaignId: 'c1', raceKey: 'elf', kind: 'preset', label: 'Elf', seedPrompt: 'x', lore: sampleLore, createdByCharacterId: null, createdAt: '' }],
        'elf'
      )
    ).toBe(true)
    expect(isEstablishedPresetRace([], 'elf')).toBe(false)
  })

  it('requires lore before confirm and blocks edits when locked', () => {
    const picked = selectPresetRace(initialRaceSelectionState(), 'elf')
    expect(canConfirmRaceSelection(picked)).toBe(false)

    const unlocked = applyLorePreview(picked, { locked: false, lore: sampleLore })
    expect(canConfirmRaceSelection(unlocked)).toBe(true)
    expect(isLoreEditable(unlocked)).toBe(true)
    expect(showRegenerateControl(unlocked)).toBe(true)

    const locked = applyLorePreview(picked, { locked: true, lore: sampleLore })
    expect(isLoreEditable(locked)).toBe(false)
    expect(showRegenerateControl(locked)).toBe(false)
    expect(updateLoreField(locked, 'summary', 'changed')).toEqual(locked)
    expect(canConfirmRaceSelection(locked)).toBe(true)
  })

  it('gates custom generate on a non-empty seed', () => {
    const custom = selectCustomRace(initialRaceSelectionState())
    expect(canGenerateLore(custom)).toBe(false)
    const withSeed = updateCustomSeed(custom, 'Moon-touched fox folk.')
    expect(canGenerateLore(withSeed)).toBe(true)
    expect(withSeed.raceKey).toBe(CUSTOM_RACE_KEY)
  })

  it('auto-generates preset picks once a race key is selected', () => {
    const preset = selectPresetRace(initialRaceSelectionState(), 'dwarf')
    expect(canGenerateLore(preset)).toBe(true)
  })
})

describe('raceSelectionLogic hydration', () => {
  it('hydrates saved preset races from the campaign catalog with locked lore', () => {
    const campaignRaces = [
      {
        id: '1',
        campaignId: 'c1',
        raceKey: 'elf',
        kind: 'preset' as const,
        label: 'Elf',
        seedPrompt: 'x',
        lore: sampleLore,
        createdByCharacterId: null,
        createdAt: ''
      }
    ]
    const hydrated = hydrateRaceSelectionState('elf', campaignRaces)
    expect(hydrated?.kind).toBe('preset')
    expect(hydrated?.raceKey).toBe('elf')
    expect(hydrated?.lore).toEqual(sampleLore)
    expect(hydrated?.loreLocked).toBe(true)
    expect(canConfirmRaceSelection(hydrated!)).toBe(true)
  })
})

describe('raceSelectionLogic custom hydration', () => {
  it('hydrates saved custom races with editable lore', () => {
    const campaignRaces = [
      {
        id: '1',
        campaignId: 'c1',
        raceKey: 'custom_fox',
        kind: 'custom' as const,
        label: 'Fox folk',
        seedPrompt: 'Moon-touched fox folk.',
        lore: sampleLore,
        createdByCharacterId: 'p1',
        createdAt: ''
      }
    ]
    const hydrated = hydrateRaceSelectionState('custom_fox', campaignRaces)
    expect(hydrated?.kind).toBe('custom')
    expect(hydrated?.customLabel).toBe('Fox folk')
    expect(hydrated?.customSeedPrompt).toBe('Moon-touched fox folk.')
    expect(hydrated?.loreLocked).toBe(false)
  })
})

describe('raceSelectionLogic draft resolution', () => {
  it('prefers hydrated saved race over an in-progress draft', () => {
    const draft = selectCustomRace(initialRaceSelectionState())
    const resolved = resolveInitialRaceSelectionState(
      'elf',
      [
        {
          id: '1',
          campaignId: 'c1',
          raceKey: 'elf',
          kind: 'preset',
          label: 'Elf',
          seedPrompt: 'x',
          lore: sampleLore,
          createdByCharacterId: null,
          createdAt: ''
        }
      ],
      draft
    )
    expect(resolved.raceKey).toBe('elf')
    expect(resolved.kind).toBe('preset')
  })
})
