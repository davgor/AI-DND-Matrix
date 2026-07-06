/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import type { BackgroundRosterEntry } from '../../../shared/characterBackground/types'
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
  selectBackground
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

describe('backgroundSelectionLogic', () => {
  it('populates read-only description from roster selection', () => {
    const state = selectBackground(initialBackgroundSelectionState(), roster[0]!)
    expect(descriptionForSelection(roster, state.backgroundKey)).toBe('You served in an army.')
  })

  it('gates confirm until a background is selected', () => {
    expect(canConfirmBackgroundSelection(initialBackgroundSelectionState())).toBe(false)
    expect(canConfirmBackgroundSelection(selectBackground(initialBackgroundSelectionState(), roster[0]!))).toBe(true)
  })

  it('hydrates saved background key and story', () => {
    expect(hydrateBackgroundSelectionState('soldier', 'I marched for years.')).toEqual({
      backgroundKey: 'soldier',
      story: 'I marched for years.'
    })
  })

  it('prefers hydrated saved background over an in-progress draft', () => {
    const resolved = resolveInitialBackgroundSelectionState(
      'noble',
      'Born to privilege.',
      { backgroundKey: 'soldier', story: 'Draft story' }
    )
    expect(resolved).toEqual({
      backgroundKey: 'noble',
      story: 'Born to privilege.'
    })
  })

  it('builds apply input with optional empty story', () => {
    const state = { backgroundKey: 'soldier', story: '   ' }
    expect(buildBackgroundApplyInput('c1', 'p1', state)?.backgroundStory).toBe('   ')
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
    const textarea = field.props.children[2] as { props: { onChange: (event: { target: { value: string } }) => void } }
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
