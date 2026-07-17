/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import type { RaceRosterGroup } from '../../../main/raceIpc'
import type { RaceLore } from '../../../shared/raceSelection/types'
import { CustomRacePanel } from './RaceSelectionCustomPanel'
import {
  LoreField,
  LorePanel,
  RacePickButton,
  RosterGroup
} from './RaceSelectionForm'
import { RaceSelectionActions } from './RaceSelectionBody'
import { RaceBackButton } from './RaceBackButton'
import {
  applyLorePreview,
  initialRaceSelectionState,
  selectCustomRace,
  selectPresetRace
} from './raceSelectionLogic'
import { CUSTOM_RACE_KEY } from '../../../engine/raceSelection/roster'
import { collectText, countClassName, findByClassName, findComponent } from './raceSelectionTestUtils'

const sampleLore: RaceLore = {
  summary: 'Elves guard the mistwood.',
  appearance: 'Silver-eyed and tall.',
  culture: 'They sing to the canopy.',
  roleInThisLand: 'Border wardens.',
  hooks: ['A sapling oracle speaks to outsiders.']
}

const roster: RaceRosterGroup[] = [
  {
    category: 'common_folk',
    label: 'Common Folk',
    entries: [
      {
        key: 'human',
        label: 'Human',
        category: 'common_folk',
        seedPrompt: 'Adaptable folk.'
      },
      {
        key: 'elf',
        label: 'Elf',
        category: 'common_folk',
        seedPrompt: 'Long-lived and graceful.'
      }
    ]
  }
]

describe('RaceSelection roster', () => {
  it('renders categorized roster groups and established badge', () => {
    const groupTree = RosterGroup({
      group: roster[0]!,
      campaignRaces: [],
      selectedRaceKey: null,
      onSelect: () => {}
    })
    expect(collectText(groupTree)).toContain('Common Folk')

    const establishedButton = RacePickButton({
      label: 'Elf',
      selected: false,
      established: true,
      onSelect: () => {}
    })
    expect(collectText(establishedButton)).toContain('Established in this world')
    expect(countClassName(establishedButton, 'race-selection-established-badge')).toBe(1)
  })
})

describe('RaceSelection lore', () => {
  it('shows editable lore with regenerate for unrealized preset picks', () => {
    const tree = LorePanel({
      title: 'What "Human" means in this land',
      lore: sampleLore,
      editable: true,
      previewLoading: false,
      showRegenerate: true,
      onRegenerate: () => {},
      onLoreChange: () => {}
    })

    expect(collectText(tree)).toContain('Regenerate')
    const summaryField = LoreField({
      label: 'Summary',
      value: sampleLore.summary,
      editable: true,
      multiline: true,
      onChange: () => {}
    })
    expect(summaryField.props.children[1].props.disabled).toBe(false)
    expect(summaryField.props.children[1].props.className).toContain('race-selection-autofit-textarea')
  })

  it('shows read-only lore for already-realized preset picks', () => {
    const tree = LorePanel({
      title: 'What "Elf" means in this land',
      lore: sampleLore,
      editable: false,
      previewLoading: false,
      showRegenerate: false,
      onRegenerate: () => {},
      onLoreChange: () => {}
    })

    expect(collectText(tree)).not.toContain('Regenerate')
    const summaryField = LoreField({
      label: 'Summary',
      value: sampleLore.summary,
      editable: false,
      multiline: true,
      onChange: () => {}
    })
    expect(summaryField.props.children[1].props.disabled).toBe(true)
  })
})

describe('RaceSelection custom flow', () => {
  it('requires custom seed before generate and confirm gating', () => {
    const custom = selectCustomRace(initialRaceSelectionState())
    const tree = CustomRacePanel({
      state: custom,
      previewLoading: false,
      onStateChange: () => {},
      onGenerate: () => {}
    })

    expect(collectText(tree)).toContain('Generate')
    expect(custom.raceKey).toBe(CUSTOM_RACE_KEY)
    expect(findByClassName(tree, 'race-selection-generate')?.props.disabled).toBe(true)
  })
})

describe('RaceSelectionForm actions', () => {
  it('invokes onBack when Back is clicked', () => {
    const onBack = vi.fn()
    const state = applyLorePreview(selectPresetRace(initialRaceSelectionState(), 'human'), {
      locked: false,
      lore: sampleLore
    })
    const tree = RaceSelectionActions({
      submitting: false,
      previewLoading: false,
      state,
      onConfirm: () => {},
      onBack
    })

    const backSlot = findComponent(tree, RaceBackButton)
    expect(backSlot).toBeDefined()
    RaceBackButton({ onBack: backSlot!.props.onBack }).props.onClick()
    expect(onBack).toHaveBeenCalledOnce()
  })
})
