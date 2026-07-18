import './raceSelection.css'

import type { RaceRosterGroup } from '../../../main/raceIpc'
import type { CampaignRace } from '../../../shared/raceSelection/types'
import { RaceSelectionActions, RaceSelectionBody } from './RaceSelectionBody'
import type { RaceSelectionState } from './raceSelectionLogic'

export function RaceSelectionForm(props: {
  roster: RaceRosterGroup[]
  campaignRaces: CampaignRace[]
  state: RaceSelectionState
  setState: (next: RaceSelectionState) => void
  previewLoading: boolean
  submitting: boolean
  error: string | null
  onPickPreset: (raceKey: string) => void
  onPickCustom: () => void
  onPreviewLore: () => void
  onConfirm: () => void
  onBack: () => void
}): JSX.Element {
  return (
    <div className="race-selection">
      <h1>Choose your race</h1>
      <p className="race-selection-subtitle">Pick an ancestry for your character in this campaign.</p>
      <RaceSelectionBody
        roster={props.roster}
        campaignRaces={props.campaignRaces}
        state={props.state}
        setState={props.setState}
        previewLoading={props.previewLoading}
        onPickPreset={props.onPickPreset}
        onPickCustom={props.onPickCustom}
        onPreviewLore={props.onPreviewLore}
      />
      {props.error ? <p className="race-selection-error">{props.error}</p> : null}
      <RaceSelectionActions
        submitting={props.submitting}
        previewLoading={props.previewLoading}
        state={props.state}
        onConfirm={props.onConfirm}
        onBack={props.onBack}
      />
    </div>
  )
}
