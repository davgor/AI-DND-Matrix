import type { BackgroundRosterEntry } from '../../../shared/characterBackground/types'
import { CUSTOM_BACKGROUND_KEY, isCustomBackgroundKey } from '../../../shared/characterBackground/types'
import { ProceedButton } from '../onboarding/ProceedButton'
import { BackgroundSelectionGenerateModal } from './BackgroundSelectionGenerateModal'
import {
  BackgroundCustomLabelField,
  BackgroundDescriptionField,
  BackgroundStoryField
} from './BackgroundSelectionFormParts'
import { OnboardingBackButton } from '../onboarding/OnboardingBackButton'
import {
  canConfirmBackgroundSelection,
  descriptionForSelection,
  selectCustomBackground,
  type BackgroundSelectionState
} from './backgroundSelectionLogic'

function BackgroundDropdown(props: {
  roster: BackgroundRosterEntry[]
  backgroundKey: string | null
  submitting: boolean
  onSelect: (key: string) => void
}): JSX.Element {
  return (
    <>
      <label className="background-selection-field-label" htmlFor="background-select">
        Background
      </label>
      <select
        id="background-select"
        className="background-selection-select"
        value={props.backgroundKey ?? ''}
        disabled={props.submitting}
        onChange={(event) => {
          if (event.target.value) {
            props.onSelect(event.target.value)
          }
        }}
      >
        <option value="">Select a background...</option>
        {props.roster.map((entry) => (
          <option key={entry.key} value={entry.key}>
            {entry.label}
          </option>
        ))}
        <option value={CUSTOM_BACKGROUND_KEY}>Custom</option>
      </select>
    </>
  )
}

function selectBackgroundKey(
  props: {
    roster: BackgroundRosterEntry[]
    state: BackgroundSelectionState
    setState: (next: BackgroundSelectionState) => void
  },
  key: string
): void {
  if (key === CUSTOM_BACKGROUND_KEY) {
    props.setState(selectCustomBackground(props.state))
    return
  }
  const entry = props.roster.find((item) => item.key === key)
  if (entry) {
    props.setState({ ...props.state, backgroundKey: entry.key, customLabel: '' })
  }
}

function BackgroundSelectionStorySection(props: {
  state: BackgroundSelectionState
  setState: (next: BackgroundSelectionState) => void
  submitting: boolean
  isCustom: boolean
  onOpenGenerate: () => void
}): JSX.Element {
  return (
    <BackgroundStoryField
      story={props.state.story}
      disabled={props.submitting}
      onChange={(value) => props.setState({ ...props.state, story: value })}
      onGenerateClick={props.onOpenGenerate}
      generateDisabled={canGenerateBackgroundStory({
        state: props.state,
        submitting: props.submitting,
        isCustom: props.isCustom
      })}
    />
  )
}

function canGenerateBackgroundStory(props: {
  state: BackgroundSelectionState
  submitting: boolean
  isCustom: boolean
}): boolean {
  return (
    Boolean(props.state.backgroundKey) &&
    !props.submitting &&
    (!props.isCustom || Boolean(props.state.customLabel.trim()))
  )
}

function BackgroundSelectionFormBody(props: {
  roster: BackgroundRosterEntry[]
  state: BackgroundSelectionState
  setState: (next: BackgroundSelectionState) => void
  submitting: boolean
  error: string | null
  onConfirm: () => void
  onOpenGenerate: () => void
}): JSX.Element {
  const description = descriptionForSelection(props.roster, props.state.backgroundKey)
  const isCustom = isCustomBackgroundKey(props.state.backgroundKey)

  return (
    <>
      <h1>Choose your background</h1>
      <BackgroundDropdown
        roster={props.roster}
        backgroundKey={props.state.backgroundKey}
        submitting={props.submitting}
        onSelect={(key) => selectBackgroundKey(props, key)}
      />
      {isCustom ? (
        <BackgroundCustomLabelField
          label={props.state.customLabel}
          disabled={props.submitting}
          onChange={(value) => props.setState({ ...props.state, customLabel: value })}
        />
      ) : null}
      <BackgroundDescriptionField description={description} />
      <BackgroundSelectionStorySection
        state={props.state}
        setState={props.setState}
        submitting={props.submitting}
        isCustom={isCustom}
        onOpenGenerate={props.onOpenGenerate}
      />
      {props.error ? <p className="background-selection-error">{props.error}</p> : null}
      <div className="background-selection-actions">
        <ProceedButton
          disabled={props.submitting || !canConfirmBackgroundSelection(props.state)}
          onClick={() => void props.onConfirm()}
        >
          {props.submitting ? 'Saving...' : 'Choose your gear'}
        </ProceedButton>
      </div>
    </>
  )
}

export function BackgroundSelectionForm(props: {
  roster: BackgroundRosterEntry[]
  state: BackgroundSelectionState
  setState: (next: BackgroundSelectionState) => void
  submitting: boolean
  error: string | null
  modalOpen: boolean
  modalLoading: boolean
  modalError: string | null
  onConfirm: () => void
  onOpenGenerate: () => void
  onCloseGenerate: () => void
  onGenerate: (playerPrompt: string) => void
  onBack: () => void
}): JSX.Element {
  return (
    <div className="background-selection">
      <OnboardingBackButton className="background-selection-back" onBack={props.onBack} />
      <BackgroundSelectionFormBody
        roster={props.roster}
        state={props.state}
        setState={props.setState}
        submitting={props.submitting}
        error={props.error}
        onConfirm={props.onConfirm}
        onOpenGenerate={props.onOpenGenerate}
      />
      <BackgroundSelectionGenerateModal
        open={props.modalOpen}
        loading={props.modalLoading}
        error={props.modalError}
        onCancel={props.onCloseGenerate}
        onGenerate={props.onGenerate}
      />
    </div>
  )
}
