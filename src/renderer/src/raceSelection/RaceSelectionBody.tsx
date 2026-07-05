import type { RaceRosterGroup } from '../../../main/raceIpc'
import type { CampaignRace } from '../../../shared/raceSelection/types'
import { ProceedButton } from '../onboarding/ProceedButton'
import { RaceBackButton } from './RaceBackButton'
import { CustomRacePanel } from './RaceSelectionCustomPanel'
import { RaceSelectionCustomSection } from './RaceSelectionCustomSection'
import { LorePanel, RosterGroup } from './RaceSelectionParts'
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
      <RaceBackButton onBack={props.onBack} />
      <ProceedButton
        disabled={
          props.submitting || props.previewLoading || !canConfirmRaceSelection(props.state)
        }
        onClick={() => void props.onConfirm()}
      >
        {props.submitting ? 'Saving...' : 'Choose your gear'}
      </ProceedButton>
    </div>
  )
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
  const editable = isLoreEditable(props.state)
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

      <RaceSelectionCustomSection
        selected={props.state.kind === 'custom'}
        onPickCustom={props.onPickCustom}
      />

      <CustomRacePanel
        state={props.state}
        previewLoading={props.previewLoading}
        onStateChange={props.setState}
        onGenerate={props.onPreviewLore}
      />

      {props.state.lore ? (
        <LorePanel
          title={lorePanelTitle(props.state, props.roster)}
          lore={props.state.lore}
          editable={editable}
          previewLoading={props.previewLoading}
          showRegenerate={showRegenerateControl(props.state)}
          onRegenerate={props.onPreviewLore}
          onLoreChange={(field, value) => props.setState(updateLoreField(props.state, field, value))}
        />
      ) : props.state.kind === 'preset' && props.previewLoading ? (
        <p className="race-selection-preview-loading">Generating lore for this land...</p>
      ) : null}
    </>
  )
}
