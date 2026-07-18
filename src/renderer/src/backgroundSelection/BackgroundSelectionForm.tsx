import type { BackgroundRosterEntry } from '../../../shared/characterBackground/types'
import { ProceedButton } from '../onboarding/ProceedButton'
import { BackgroundSelectionGenerateModal } from './BackgroundSelectionGenerateModal'
import {
  BackgroundDescriptionField,
  BackgroundStoryField
} from './BackgroundSelectionFormParts'
import { OnboardingBackButton } from '../onboarding/OnboardingBackButton'
import {
  canConfirmBackgroundSelection,
  descriptionForSelection,
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
      </select>
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
  const description = descriptionForSelection(props.roster, props.state.backgroundKey)

  return (
    <div className="background-selection">
      <OnboardingBackButton className="background-selection-back" onBack={props.onBack} />
      <h1>Choose your background</h1>
      <BackgroundDropdown
        roster={props.roster}
        backgroundKey={props.state.backgroundKey}
        submitting={props.submitting}
        onSelect={(key) => props.setState({ ...props.state, backgroundKey: key })}
      />
      <BackgroundDescriptionField description={description} />
      <BackgroundStoryField
        story={props.state.story}
        disabled={props.submitting}
        onChange={(value) => props.setState({ ...props.state, story: value })}
        onGenerateClick={props.onOpenGenerate}
        generateDisabled={!props.state.backgroundKey || props.submitting}
      />
      {props.error ? <p className="background-selection-error">{props.error}</p> : null}
      <div className="background-selection-actions">
        <ProceedButton disabled={props.submitting || !canConfirmBackgroundSelection(props.state)} onClick={() => void props.onConfirm()}>
          {props.submitting ? 'Saving...' : 'Choose your gear'}
        </ProceedButton>
      </div>
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
