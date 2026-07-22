/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import type { BackgroundRosterEntry } from '../../../shared/characterBackground/types'
import { CUSTOM_BACKGROUND_KEY } from '../../../shared/characterBackground/types'
import {
  BackgroundDescriptionField,
  BackgroundStoryField
} from './BackgroundSelectionFormParts'
import { buildBackgroundApplyInput } from './backgroundSelectionApply'
import {
  canConfirmBackgroundSelection,
  descriptionForSelection,
  hydrateBackgroundSelectionState,
  initialBackgroundSelectionState,
  resolveInitialBackgroundSelectionState,
  selectBackground,
  selectCustomBackground
} from './backgroundSelectionLogic'

const roster: BackgroundRosterEntry[] = [
  {
    key: 'soldier',
    label: 'Soldier',
    description: 'You served in an army.'
  },
  {
    key: 'noble',
    label: 'Noble',
    description: 'Born to privilege.'
  }
]

describe('backgroundSelectionLogic selection', () => {
  it('populates read-only description from roster selection', () => {
    const state = selectBackground(initialBackgroundSelectionState(), roster[0]!)
    expect(descriptionForSelection(roster, state.backgroundKey)).toBe('You served in an army.')
  })

  it('gates confirm until a background is selected', () => {
    expect(canConfirmBackgroundSelection(initialBackgroundSelectionState())).toBe(false)
    expect(canConfirmBackgroundSelection(selectBackground(initialBackgroundSelectionState(), roster[0]!))).toBe(
      true
    )
  })

  it('requires a custom label for custom backgrounds', () => {
    const custom = selectCustomBackground(initialBackgroundSelectionState())
    expect(canConfirmBackgroundSelection(custom)).toBe(false)
    expect(canConfirmBackgroundSelection({ ...custom, customLabel: 'River Smuggler' })).toBe(true)
  })
})

describe('backgroundSelectionLogic hydrate and apply', () => {
  it('hydrates saved background key, story, and custom label', () => {
    expect(hydrateBackgroundSelectionState('soldier', 'I marched for years.')).toEqual({
      backgroundKey: 'soldier',
      customLabel: '',
      story: 'I marched for years.'
    })
    expect(hydrateBackgroundSelectionState(CUSTOM_BACKGROUND_KEY, 'Story', 'River Smuggler')).toEqual({
      backgroundKey: CUSTOM_BACKGROUND_KEY,
      customLabel: 'River Smuggler',
      story: 'Story'
    })
  })

  it('prefers hydrated saved background over an in-progress draft', () => {
    const resolved = resolveInitialBackgroundSelectionState('noble', 'Born to privilege.', {
      backgroundKey: 'soldier',
      customLabel: '',
      story: 'Draft story'
    })
    expect(resolved).toEqual({
      backgroundKey: 'noble',
      customLabel: '',
      story: 'Born to privilege.'
    })
  })

  it('builds apply input with optional empty story', () => {
    const state = { backgroundKey: 'soldier', customLabel: '', story: '   ' }
    expect(buildBackgroundApplyInput('c1', 'p1', state)?.backgroundStory).toBe('   ')
  })

  it('builds apply input for custom with label', () => {
    const state = {
      backgroundKey: CUSTOM_BACKGROUND_KEY,
      customLabel: 'River Smuggler',
      story: 'I smuggled.'
    }
    expect(buildBackgroundApplyInput('c1', 'p1', state)).toEqual({
      campaignId: 'c1',
      characterId: 'p1',
      backgroundKey: CUSTOM_BACKGROUND_KEY,
      backgroundStory: 'I smuggled.',
      backgroundCustomLabel: 'River Smuggler'
    })
  })
})

describe('BackgroundSelectionForm fields', () => {
  it('renders read-only description text', () => {
    const field = BackgroundDescriptionField({ description: 'You served in an army.' })
    expect(field.props.readOnly).toBe(true)
    expect(field.props.value).toBe('You served in an army.')
  })

  it('keeps story editable and wires generate click', () => {
    const onGenerateClick = vi.fn()
    const onChange = vi.fn()
    const field = BackgroundStoryField({
      story: 'Draft',
      disabled: false,
      onChange,
      onGenerateClick,
      generateDisabled: false
    })
    const generateButton = field.props.children[1] as { props: { onClick: () => void } }
    generateButton.props.onClick()
    expect(onGenerateClick).toHaveBeenCalledOnce()
    const textarea = field.props.children[2] as {
      props: { onChange: (event: { target: { value: string } }) => void }
    }
    textarea.props.onChange({ target: { value: 'Edited' } })
    expect(onChange).toHaveBeenCalledWith('Edited')
  })
})

describe('BackgroundSelectionForm confirm gating', () => {
  it('requires a selected background before apply input is built', () => {
    expect(buildBackgroundApplyInput('c1', 'p1', initialBackgroundSelectionState())).toBeNull()
    expect(
      buildBackgroundApplyInput('c1', 'p1', selectBackground(initialBackgroundSelectionState(), roster[0]!))
    ).not.toBeNull()
  })
})
