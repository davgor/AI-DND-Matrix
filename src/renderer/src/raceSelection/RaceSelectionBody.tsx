import type { RaceRosterGroup } from '../../../main/raceIpc'
import type { CampaignRace } from '../../../shared/raceSelection/types'
import { ProceedButton } from '../onboarding/ProceedButton'
import { OnboardingBackButton } from '../onboarding/OnboardingBackButton'
import { CustomRacePanel } from './RaceSelectionCustomPanel'
import { LorePanel, RacePickButton, RosterGroup } from './RaceSelectionParts'
import { lorePanelTitle } from './raceSelectionTitles'
import {
  canConfirmRaceSelection,
  isLoreEditable,
  showRegenerateControl,
  updateLoreField,
  type RaceSelectionState
} from './raceSelectionLogic'

export function RaceSelectionActions(props: {
  submitting: boolean
  previewLoading: boolean
  state: RaceSelectionState
  onConfirm: () => void
  onBack: () => void
}): JSX.Element {
  return (
    <div className="race-selection-actions">
      <OnboardingBackButton onBack={props.onBack} />
      <ProceedButton
        disabled={
          props.submitting || props.previewLoading || !canConfirmRaceSelection(props.state)
        }
        onClick={() => void props.onConfirm()}
      >
        {props.submitting ? 'Saving...' : 'Choose your background'}
      </ProceedButton>
    </div>
  )
}

function RaceLoreSection(props: {
  roster: RaceRosterGroup[]
  state: RaceSelectionState
  setState: (next: RaceSelectionState) => void
  previewLoading: boolean
  onPreviewLore: () => void
}): JSX.Element | null {
  if (props.state.lore) {
    return (
      <LorePanel
        title={lorePanelTitle(props.state, props.roster)}
        lore={props.state.lore}
        editable={isLoreEditable(props.state)}
        previewLoading={props.previewLoading}
        showRegenerate={showRegenerateControl(props.state)}
        onRegenerate={props.onPreviewLore}
        onLoreChange={(field, value) => props.setState(updateLoreField(props.state, field, value))}
      />
    )
  }
  if (props.state.kind === 'preset' && props.previewLoading) {
    return <p className="race-selection-preview-loading">Generating lore for this land...</p>
  }
  return null
}

export function RaceSelectionBody(props: {
  roster: RaceRosterGroup[]
  campaignRaces: CampaignRace[]
  state: RaceSelectionState
  setState: (next: RaceSelectionState) => void
  previewLoading: boolean
  onPickPreset: (raceKey: string) => void
  onPickCustom: () => void
  onPreviewLore: () => void
}): JSX.Element {
  return (
    <>
      {props.roster.map((group) => (
        <RosterGroup
          key={group.category}
          group={group}
          campaignRaces={props.campaignRaces}
          selectedRaceKey={props.state.kind === 'preset' ? props.state.raceKey : null}
          onSelect={props.onPickPreset}
        />
      ))}
      <section className="race-selection-group">
        <h2>Custom</h2>
        <div className="race-selection-options">
          <RacePickButton
            label="Custom race ✎"
            selected={props.state.kind === 'custom'}
            onSelect={props.onPickCustom}
          />
        </div>
      </section>
      <CustomRacePanel
        state={props.state}
        previewLoading={props.previewLoading}
        onStateChange={props.setState}
        onGenerate={props.onPreviewLore}
      />
      <RaceLoreSection
        roster={props.roster}
        state={props.state}
        setState={props.setState}
        previewLoading={props.previewLoading}
        onPreviewLore={props.onPreviewLore}
      />
    </>
  )
}
